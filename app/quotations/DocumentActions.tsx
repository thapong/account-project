"use client";
import { useState, useTransition } from "react";
import { acceptQuotation, cancelQuotation, issueInvoice, sendQuotation } from "@/lib/documents/actions";
export default function DocumentActions({ id, status, allowInvoice }: { id: string; status: string; allowInvoice?: boolean }) {
  const [pending, start] = useTransition(); const [error, setError] = useState("");
  const run = (fn: (id: string) => Promise<{ ok: boolean; error?: string; id?: string }>) => start(async () => { setError(""); const result = await fn(id); if (!result.ok) setError(result.error ?? "ดำเนินการไม่สำเร็จ"); else window.location.reload(); });
  return <div className="flex flex-wrap items-center gap-2">{error && <span className="text-sm text-error" role="alert">{error}</span>}{status === "draft" && <button className="btn-primary" disabled={pending} onClick={() => run(sendQuotation)}>ส่งให้ลูกค้า</button>}{status === "sent" && <button className="btn-primary" disabled={pending} onClick={() => run(acceptQuotation)}>บันทึกว่าลูกค้าตอบรับ</button>}{status !== "cancelled" && status !== "accepted" && <button className="btn-danger" disabled={pending} onClick={() => run(cancelQuotation)}>ยกเลิก</button>}{allowInvoice && status === "accepted" && <button className="btn-primary" disabled={pending} onClick={() => run(issueInvoice)}>ออกใบแจ้งหนี้</button>}</div>;
}
