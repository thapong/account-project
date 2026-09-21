"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isSetupAvailable, setupFirstAdmin } from "@/lib/auth";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password";

export type SetupActionState = { error?: string };

const setupSchema = z.object({
  setupToken: z.string().min(1),
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export async function setupAction(_previous: SetupActionState, formData: FormData): Promise<SetupActionState> {
  const parsed = setupSchema.safeParse({
    setupToken: formData.get("setupToken"), displayName: formData.get("displayName"),
    email: formData.get("email"), password: formData.get("password"),
  });
  if (!parsed.success) return { error: `ชื่อ อีเมล และรหัสผ่านต้องถูกต้อง (รหัสผ่านอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร)` };
  let result;
  try {
    if (!(await isSetupAvailable())) return { error: "การตั้งค่าผู้ดูแลระบบเสร็จสิ้นแล้ว" };
    result = await setupFirstAdmin(parsed.data);
  } catch {
    return { error: "ไม่สามารถสร้างผู้ดูแลระบบได้ในขณะนี้" };
  }
  if (result.user) redirect("/");
  return { error: result.error ?? "ไม่สามารถสร้างผู้ดูแลระบบได้" };
}
