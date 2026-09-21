"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { MasterActionState } from "@/lib/masters/types";

function Submit({ children, tone }: { children: React.ReactNode; tone: string }) { const { pending } = useFormStatus(); return <button className={`${tone} min-h-11 disabled:opacity-60`} type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : children}</button>; }
export default function MutationForm({ action, children, tone = "btn-primary" }: { action: () => Promise<MasterActionState>; children: React.ReactNode; tone?: string }) {
  const invoke = async (previous: MasterActionState, formData: FormData) => { void previous; void formData; return action(); };
  const [state, formAction] = useActionState(invoke, {});
  return <form action={formAction} className="flex flex-wrap items-center gap-3"><Submit tone={tone}>{children}</Submit>{state.message ? <span className={state.ok ? "notice" : "notice-error"} role={state.ok ? "status" : "alert"}>{state.message}</span> : null}</form>;
}
