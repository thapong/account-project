"use client";

import { useActionState } from "react";
import { createUserAction, type UserActionState } from "@/app/users/actions";

export default function CreateUserForm() {
  const [state, action, pending] = useActionState<UserActionState, FormData>(createUserAction, {});
  return (
    <form action={action} className="panel p-5 flex flex-col gap-4" noValidate>
      <div><p className="panel-heading">เพิ่มผู้ใช้งาน</p><p className="text-sm text-bodytext">บัญชีใหม่จะเปิดใช้งานทันที</p></div>
      {state.error ? <div className="notice notice-error" role="alert">{state.error}</div> : null}
      {state.success ? <div className="notice" role="status">{state.success}</div> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field"><label htmlFor="displayName" className="field-label">ชื่อ</label><input id="displayName" name="displayName" required className="input" /></div>
        <div className="field"><label htmlFor="email" className="field-label">อีเมล</label><input id="email" name="email" type="email" required className="input" /></div>
        <div className="field"><label htmlFor="password" className="field-label">รหัสผ่าน (อย่างน้อย 10 ตัวอักษร)</label><input id="password" name="password" type="password" minLength={10} required className="input" /></div>
        <div className="field"><label htmlFor="role" className="field-label">บทบาท</label><select id="role" name="role" defaultValue="sales" className="input"><option value="admin">ผู้ดูแลระบบ</option><option value="manager">ผู้จัดการ</option><option value="sales">ฝ่ายขาย</option><option value="accounting">บัญชี</option></select></div>
      </div>
      <div><button type="submit" className="btn-primary" disabled={pending} aria-disabled={pending}>{pending ? "กำลังสร้าง…" : "เพิ่มผู้ใช้งาน"}</button></div>
    </form>
  );
}
