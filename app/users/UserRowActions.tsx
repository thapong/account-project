"use client";

import { useActionState } from "react";
import { updateUserAction, type UserActionState, type UserListItem } from "@/app/users/actions";
import type { Role } from "@/lib/auth";

const roles: Array<[Role, string]> = [["admin", "ผู้ดูแลระบบ"], ["manager", "ผู้จัดการ"], ["sales", "ฝ่ายขาย"], ["accounting", "บัญชี"]];

function Result({ state }: { state: UserActionState }) {
  if (state.error) return <span className="text-xs text-error" role="alert">{state.error}</span>;
  if (state.success) return <span className="text-xs text-success" role="status">{state.success}</span>;
  return null;
}

export default function UserRowActions({ user }: { user: UserListItem }) {
  const [roleState, roleAction, rolePending] = useActionState<UserActionState, FormData>(async (_previous, formData) => updateUserAction(formData), {});
  const [statusState, statusAction, statusPending] = useActionState<UserActionState, FormData>(async (_previous, formData) => updateUserAction(formData), {});
  return <>
    <form action={roleAction} className="flex items-center gap-2 flex-wrap">
      <input type="hidden" name="id" value={user.id} /><input type="hidden" name="isActive" value={user.is_active ? "true" : "false"} />
      <label className="sr-only" htmlFor={`role-${user.id}`}>บทบาทของ {user.display_name}</label>
      <select id={`role-${user.id}`} name="role" defaultValue={user.role} className="input min-w-32">{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <button type="submit" className="btn-secondary" disabled={rolePending} aria-disabled={rolePending}>{rolePending ? "กำลังบันทึก…" : "บันทึก"}</button>
      <Result state={roleState} />
    </form>
    <form action={statusAction} className="flex items-center gap-2 flex-wrap">
      <input type="hidden" name="id" value={user.id} /><input type="hidden" name="role" value={user.role} /><input type="hidden" name="isActive" value={user.is_active ? "false" : "true"} />
      <button type="submit" className={user.is_active ? "btn-danger" : "btn-secondary"} disabled={statusPending} aria-disabled={statusPending}>{statusPending ? "กำลังบันทึก…" : user.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
      <Result state={statusState} />
    </form>
  </>;
}
