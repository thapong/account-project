"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate, destroySession } from "@/lib/auth";

export type AuthActionState = { error?: string };

const loginSchema = z.object({
  email: z.string().trim().email("กรุณากรอกอีเมลที่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export async function loginAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน" };
  let result;
  try {
    result = await authenticate(parsed.data.email, parsed.data.password);
  } catch {
    return { error: "ไม่สามารถเข้าสู่ระบบได้ในขณะนี้" };
  }
  if (result.user) redirect("/");
  return { error: result.limited ? "เข้าสู่ระบบไม่ได้ในขณะนี้ กรุณาลองใหม่ภายหลัง" : "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
}

export async function logoutAction(): Promise<void> {
  try { await destroySession(); } finally { redirect("/auth/login"); }
}
