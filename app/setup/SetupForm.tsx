"use client";

import Link from "next/link";
import { useActionState } from "react";
import { setupAction, type SetupActionState } from "@/app/setup/actions";

export default function SetupForm() {
  const [state, action, pending] = useActionState<SetupActionState, FormData>(setupAction, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error ? <div className="notice notice-error" role="alert">{state.error}</div> : null}
      <div className="field"><label htmlFor="setupToken" className="field-label">Setup token</label><input id="setupToken" name="setupToken" type="password" autoComplete="off" required className="input" /></div>
      <div className="field"><label htmlFor="displayName" className="field-label">ชื่อผู้ดูแลระบบ</label><input id="displayName" name="displayName" type="text" autoComplete="name" required className="input" /></div>
      <div className="field"><label htmlFor="email" className="field-label">อีเมล</label><input id="email" name="email" type="email" autoComplete="email" required className="input" /></div>
      <div className="field"><label htmlFor="password" className="field-label">รหัสผ่าน (อย่างน้อย 10 ตัวอักษร)</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className="input" /></div>
      <button className="btn-primary w-full" type="submit" disabled={pending} aria-disabled={pending}>{pending ? "กำลังสร้างบัญชี…" : "สร้างผู้ดูแลระบบ"}</button>
      <p className="text-center text-sm text-bodytext"><Link href="/auth/login" className="font-semibold text-primary hover:underline">กลับไปเข้าสู่ระบบ</Link></p>
    </form>
  );
}
