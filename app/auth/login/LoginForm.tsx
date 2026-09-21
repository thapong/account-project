"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthActionState } from "@/app/auth/actions";

const initialState: AuthActionState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error ? <div className="notice notice-error" role="alert">{state.error}</div> : null}
      <div className="field"><label htmlFor="email" className="field-label">อีเมล</label><input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="name@company.com" /></div>
      <div className="field"><label htmlFor="password" className="field-label">รหัสผ่าน</label><input id="password" name="password" type="password" autoComplete="current-password" required className="input" /></div>
      <button className="btn-primary w-full" type="submit" disabled={pending} aria-disabled={pending}>{pending ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}</button>
      <p className="text-center text-sm text-bodytext">ตั้งค่าครั้งแรก? <Link href="/setup" className="font-semibold text-primary hover:underline">สร้างผู้ดูแลระบบ</Link></p>
    </form>
  );
}
