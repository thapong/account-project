"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBillingNote } from "@/lib/documents/actions";

export default function BillingNoteActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  if (status === "cancelled") return <span className="badge">ยกเลิกแล้ว</span>;

  function cancel() {
    if (!window.confirm("ยืนยันยกเลิกใบวางบิลนี้หรือไม่?")) return;
    setError("");
    startTransition(async () => {
      const result = await cancelBillingNote(id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return <div className="flex flex-wrap items-center gap-2"><button type="button" className="btn-danger" disabled={isPending} onClick={cancel}>{isPending ? "กำลังยกเลิก..." : "ยกเลิกใบวางบิล"}</button>{error ? <span role="alert" className="text-sm text-red-700">{error}</span> : null}</div>;
}
