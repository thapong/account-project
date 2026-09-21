"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, type Role } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { query, transaction } from "@/lib/db";
import { pageCount, parsePagination, type PaginatedResult, type PaginationInput } from "@/lib/pagination";

export type UserActionState = { error?: string; success?: string };

const roleSchema = z.enum(["admin", "manager", "sales", "accounting"]);
const createSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(10).max(128),
  role: roleSchema,
});
const idSchema = z.string().uuid();

export type UserListItem = { id: string; email: string; display_name: string; role: Role; is_active: boolean; created_at: string };

export async function listUsers(input: PaginationInput = {}): Promise<PaginatedResult<UserListItem>> {
  await requireUser(["admin"]);
  const { page, pageSize, offset } = parsePagination(input);
  const [rows, totals] = await Promise.all([query<UserListItem>(
    `SELECT id, email, display_name, role, is_active, created_at::text
       FROM users
      ORDER BY is_active DESC, display_name ASC, email ASC LIMIT $1 OFFSET $2`,
    [pageSize, offset],
  ), query<{ total: string }>("SELECT count(*)::text AS total FROM users")]);
  const total = Number(totals[0]?.total ?? 0);
  return { rows, total, page, pageSize, pageCount: pageCount(total, pageSize) };
}

export async function createUserAction(_previous: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await requireUser(["admin"]);
  const parsed = createSchema.safeParse({
    displayName: formData.get("displayName"), email: formData.get("email"),
    password: formData.get("password"), role: formData.get("role"),
  });
  if (!parsed.success) return { error: "กรุณากรอกชื่อ อีเมล บทบาท และรหัสผ่านให้ถูกต้อง" };
  try {
    const passwordHash = await hashPassword(parsed.data.password);
    await query(
      `INSERT INTO users (email, display_name, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true)`,
      [parsed.data.email.toLowerCase(), parsed.data.displayName, passwordHash, parsed.data.role],
    );
    revalidatePath("/users");
    return { success: `สร้างผู้ใช้ ${parsed.data.displayName} เรียบร้อยแล้ว` };
  } catch {
    // Do not expose constraint names or database details.
    return { error: actor ? "ไม่สามารถสร้างผู้ใช้ได้ อีเมลอาจถูกใช้งานแล้ว" : "ไม่สามารถสร้างผู้ใช้ได้" };
  }
}

export async function updateUserAction(formData: FormData): Promise<UserActionState> {
  const actor = await requireUser(["admin"]);
  const id = idSchema.safeParse(formData.get("id"));
  const role = roleSchema.safeParse(formData.get("role"));
  const activeValue = z.enum(["true", "false"]).safeParse(formData.get("isActive"));
  if (!id.success || !role.success || !activeValue.success) return { error: "ข้อมูลผู้ใช้ไม่ถูกต้อง" };
  const active = activeValue.data === "true";

  const result = await transaction<{ ok: boolean; reason?: string }>(async (client) => {
    const targetResult = await client.query<{ id: string; role: Role; is_active: boolean }>(
      "SELECT id, role, is_active FROM users WHERE id = $1 FOR UPDATE", [id.data],
    );
    const target = targetResult.rows[0];
    if (!target) return { ok: false };

    if (target.id === actor.id && (!active || role.data !== "admin")) {
      return { ok: false, reason: "คุณไม่สามารถปิดใช้งานหรือลดบทบาทของบัญชีตัวเองได้" };
    }

    const becomesNonAdmin = target.role === "admin" && (!active || role.data !== "admin");
    if (becomesNonAdmin) {
      const admins = await client.query<{ id: string }>(
        "SELECT id FROM users WHERE role = 'admin' AND is_active = true FOR UPDATE",
      );
      if (admins.rows.length <= 1) return { ok: false, reason: "ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อยหนึ่งคน" };
    }

    await client.query(
      "UPDATE users SET role = $2, is_active = $3, updated_at = now() WHERE id = $1",
      [id.data, role.data, active],
    );
    return { ok: true };
  });

  if (!result.ok) return { error: result.reason ?? "ไม่สามารถแก้ไขผู้ใช้ได้" };
  revalidatePath("/users");
  return { success: "บันทึกแล้ว" };
}
