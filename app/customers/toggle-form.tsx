"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toggleCustomerAction } from "@/lib/masters/actions";
import type { MasterActionState } from "@/lib/masters/types";
function Button({ label }: { label: string }) { const { pending } = useFormStatus(); return <button className="btn-secondary min-h-11 disabled:opacity-60" disabled={pending} type="submit">{pending ? "กำลังบันทึก…" : label}</button>; }
export default function CustomerToggleForm({ id, label }: { id: string; label: string }) { const action = toggleCustomerAction.bind(null, id); const invoke = async (previous: MasterActionState, formData: FormData) => { void previous; void formData; return action(); }; const [state, formAction] = useActionState(invoke, {}); return <form action={formAction}><Button label={label} />{state.message ? <span className="sr-only" role="alert">{state.message}</span> : null}</form>; }
