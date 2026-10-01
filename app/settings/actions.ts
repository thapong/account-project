"use server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type SettingsState = { message: string; success?: boolean };
export async function saveSettings(_state: SettingsState, form: FormData): Promise<SettingsState> {
  await requireUser(["admin"]);
  const data = z.object({
    legal_name: z.string().trim().min(2).max(300),
    tax_id: z.string().trim().max(32),
    address: z.string().trim().max(2000),
    phone: z.string().trim().max(100),
    email: z.union([z.literal(""), z.email()]),
    bank_name: z.string().trim().max(200), bank_branch: z.string().trim().max(200), bank_account_no: z.string().trim().max(100),
  }).safeParse(Object.fromEntries(form));
  if (!data.success) return { message: "ตรวจสอบชื่อบริษัทและรูปแบบอีเมลให้ถูกต้อง" };
  const v = data.data;
  try {
    await query('UPDATE company_settings SET legal_name=$1,tax_id=$2,address=$3,phone=$4,email=$5,bank_name=$6,bank_branch=$7,bank_account_no=$8 WHERE id=true', [v.legal_name,v.tax_id,v.address,v.phone,v.email,v.bank_name,v.bank_branch,v.bank_account_no]);
    revalidatePath('/settings');
    return { message: "บันทึกข้อมูลบริษัทแล้ว เอกสารใหม่จะใช้ข้อมูลนี้", success: true };
  } catch { return { message: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" }; }
}
