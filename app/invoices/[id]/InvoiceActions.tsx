"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmInvoice, updateInvoiceMeta } from "@/lib/documents/actions";

type Props = { id: string; invoiceNo: string; documentTitle: string; documentDate: string; dueDate: string | null; confirmed: boolean; };

export default function InvoiceActions({ id, invoiceNo, documentTitle, documentDate, dueDate, confirmed }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  function save(formData: FormData) {
    setError(""); setMessage("");
    startTransition(async () => { const result = await updateInvoiceMeta(id, formData); if (result.ok) { setMessage(result.message ?? "บันทึกแล้ว"); setEditing(false); router.refresh(); } else setError(result.error); });
  }
  function confirm() {
    setError(""); setMessage("");
    startTransition(async () => { const result = await confirmInvoice(id); if (result.ok) { setMessage(result.message ?? "ยืนยันแล้ว"); router.refresh(); } else setError(result.error); });
  }
  if (confirmed) return <span className="badge">ยืนยันแล้ว</span>;
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2"><button type="button" className="btn-secondary" onClick={() => setEditing((value) => !value)} disabled={pending}>{editing ? "ปิดการแก้ไข" : "แก้ไขเลขที่ / วันที่ / ชื่อเอกสาร"}</button><button type="button" className="btn-primary" onClick={confirm} disabled={pending}>{pending ? "กำลังบันทึก..." : "ยืนยันใบแจ้งหนี้"}</button></div>
    {editing ? <form action={save} className="grid gap-3 rounded-lg border border-border bg-slate-50 p-4 sm:grid-cols-2">
      <label className="field"><span className="field-label">รูปแบบหัวเอกสาร</span><select className="input" name="documentTitle" defaultValue={documentTitle}><option value="ใบแจ้งหนี้">ใบแจ้งหนี้</option><option value="Invoice">Invoice</option></select></label>
      <label className="field"><span className="field-label">เลขที่</span><input className="input" name="invoiceNo" defaultValue={invoiceNo} required /></label>
      <label className="field"><span className="field-label">วันที่เอกสาร</span><input className="input" type="date" name="documentDate" defaultValue={documentDate} required /></label>
      <label className="field"><span className="field-label">วันครบกำหนด</span><input className="input" type="date" name="dueDate" defaultValue={dueDate ?? ""} /></label>
      <div className="sm:col-span-2"><button className="btn-primary" type="submit" disabled={pending}>{pending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</button></div>
    </form> : null}
    {message ? <p className="text-sm text-emerald-700" role="status">{message}</p> : null}{error ? <p className="text-sm text-error" role="alert">{error}</p> : null}
  </div>;
}
