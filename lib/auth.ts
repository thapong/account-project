import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/password";
import { query, transaction } from "@/lib/db";

export type Role = "admin" | "manager" | "sales" | "accounting";

export type SessionUser = {
  id: string;
  email: string;
  display_name: string;
  role: Role;
};

type UserRow = SessionUser & { password_hash: string; is_active: boolean };
type LoginResult = { user: SessionUser | null; limited: boolean };

const SESSION_COOKIE = "srp_session";
const SESSION_DAYS = 7;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const DUMMY_EMAIL = "__invalid_login__";

function sessionHash(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function publicUser(row: Pick<UserRow, "id" | "email" | "display_name" | "role">): SessionUser {
  return { id: row.id, email: row.email, display_name: row.display_name, role: row.role };
}

function cookieOptions(expires: Date) {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO auth_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [sessionHash(token), userId, expires],
  );
  (await cookies()).set({ ...cookieOptions(expires), value: token });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await query("DELETE FROM auth_sessions WHERE token_hash = $1", [sessionHash(token)]);
  }
  store.set({ ...cookieOptions(new Date(0)), maxAge: 0 });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await query<SessionUser>(
    `SELECT u.id, u.email, u.display_name, u.role
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND u.is_active = true
      LIMIT 1`,
    [sessionHash(token)],
  );
  if (!rows[0]) return null;
  return publicUser(rows[0]);
}

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (roles && !roles.includes(user.role)) redirect("/?error=forbidden");
  return user;
}

export async function isSetupAvailable(): Promise<boolean> {
  const rows = await query<{ count: string }>("SELECT count(*)::text AS count FROM users");
  return Number(rows[0]?.count ?? 0) === 0 && Boolean(process.env.SETUP_TOKEN);
}

function loginKey(email: string): string {
  return `email:${email || DUMMY_EMAIL}`;
}

/**
 * Login is intentionally generic to callers: it does not reveal whether the
 * address exists, is disabled, or is currently rate limited.
 */
export async function authenticate(emailInput: string, password: string): Promise<LoginResult> {
  const email = normalizeEmail(emailInput);
  const result = await transaction<LoginResult>(async (client) => {
    await client.query(
      `INSERT INTO auth_login_attempts (attempt_key, attempts, window_started_at, blocked_until)
       VALUES ($1, 0, now(), NULL)
       ON CONFLICT (attempt_key) DO NOTHING`,
      [loginKey(email)],
    );
    const attempt = await client.query<{
      attempts: number;
      window_started_at: Date;
      blocked_until: Date | null;
    }>("SELECT attempts, window_started_at, blocked_until FROM auth_login_attempts WHERE attempt_key = $1 FOR UPDATE", [loginKey(email)]);
    const state = attempt.rows[0];
    const now = Date.now();
    if (state?.blocked_until && new Date(state.blocked_until).getTime() > now) {
      return { user: null, limited: true };
    }
    if (state && now - new Date(state.window_started_at).getTime() >= LOGIN_WINDOW_MS) {
      await client.query(
        "UPDATE auth_login_attempts SET attempts = 0, window_started_at = now(), blocked_until = NULL WHERE attempt_key = $1",
        [loginKey(email)],
      );
    }

    const userResult = await client.query<UserRow>(
      "SELECT id, email, display_name, role, password_hash, is_active FROM users WHERE lower(email) = $1 LIMIT 1",
      [email],
    );
    const row = userResult.rows[0];
    const valid = row ? await verifyPassword(password, row.password_hash) : Boolean(await hashPassword(password));
    if (!row || !row.is_active || !valid) {
      const current = state && now - new Date(state.window_started_at).getTime() < LOGIN_WINDOW_MS ? state.attempts : 0;
      const attempts = current + 1;
      const blockedUntil = attempts >= LOGIN_MAX_ATTEMPTS ? new Date(Date.now() + LOGIN_WINDOW_MS) : null;
      await client.query(
        `UPDATE auth_login_attempts
            SET attempts = $2, blocked_until = $3, updated_at = now()
          WHERE attempt_key = $1`,
        [loginKey(email), attempts, blockedUntil],
      );
      return { user: null, limited: attempts >= LOGIN_MAX_ATTEMPTS };
    }

    await client.query("DELETE FROM auth_login_attempts WHERE attempt_key = $1", [loginKey(email)]);
    return { user: publicUser(row), limited: false };
  });

  if (result.user) await createSession(result.user.id);
  return result;
}

export async function setupFirstAdmin(input: {
  setupToken: string;
  displayName: string;
  email: string;
  password: string;
}): Promise<{ user: SessionUser | null; error?: string }> {
  const configuredToken = process.env.SETUP_TOKEN;
  if (!configuredToken || !safeEqual(input.setupToken, configuredToken)) {
    return { user: null, error: "ไม่สามารถยืนยันโทเค็นการตั้งค่าได้" };
  }
  const email = normalizeEmail(input.email);
  const result = await transaction<{ user: SessionUser | null; error?: string }>(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('srp:first-admin'))");
    const count = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM users");
    if (Number(count.rows[0]?.count ?? 0) > 0) {
      return { user: null, error: "การตั้งค่าผู้ดูแลระบบเสร็จสิ้นแล้ว" };
    }
    const passwordHash = await hashPassword(input.password);
    try {
      const inserted = await client.query<SessionUser>(
        `INSERT INTO users (email, display_name, password_hash, role, is_active)
         VALUES ($1, $2, $3, 'admin', true)
         RETURNING id, email, display_name, role`,
        [email, input.displayName.trim(), passwordHash],
      );
      return { user: inserted.rows[0] ? publicUser(inserted.rows[0]) : null };
    } catch {
      return { user: null, error: "ไม่สามารถสร้างผู้ดูแลระบบได้" };
    }
  });
  if (result.user) await createSession(result.user.id);
  return result;
}
