"use client";
import { useFormStatus } from "react-dom";
export default function MutationButton({ children, tone = "btn-primary" }: { children: React.ReactNode; tone?: string }) { const { pending } = useFormStatus(); return <button className={`${tone} min-h-11 disabled:opacity-60`} type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : children}</button>; }
