"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueInvoice } from "@/lib/documents/actions";

type Line = { id: string; line_no: number; name_snapshot: string; product_code_snapshot: string; quantity: string; total_amount: string; net_amount: string; source_invoice_no?: string | null };

export default function InvoiceComposer({ quotationId, lines }: { quotationId: string; lines: Line[] }) {
  const router = useRouter();
  const available = lines.filter((line) => !line.source_invoice_no);
  const [selected, setSelected] = useState<string[]>(available.map((line) => line.id));
  const [whtChoice, setWhtChoice] = useState("0");
  const [customWht, setCustomWht] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const rate = whtChoice === "custom" ? customWht : whtChoice;
  const preview = useMemo(() => available.filter((line) => selected.includes(line.id)).reduce((sum, line) => sum + Number(line.total_amount), 0), [available, selected]);
  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function submit() {
    setError("");
    startTransition(async () => {
      const result = await issueInvoice(quotationId, selected, rate || "0");
      if (result.ok) router.push(`/invoices/${result.id}`); else setError(result.error);
    });
  }
  return <div className="mt-5 rounded-lg border border-border bg-slate-50 p-4">
    <div className="mb-3 font-semibold">ออกใบแจ้งหนี้จากรายการที่เลือก</div>
    <div className="space-y-2">{lines.map((line) => <label key={line.id} className={`flex items-center gap-3 rounded border p-3 ${line.source_invoice_no ? "bg-slate-100 text-bodytext" : "bg-white"}`}>
      <input type="checkbox" checked={selected.includes(line.id)} disabled={Boolean(line.source_invoice_no) || pending} onChange={() => toggle(line.id)} />
      <span className="flex-1"><b>{line.line_no}. {line.name_snapshot}</b><span className="ml-2 text-xs text-bodytext">{line.product_code_snapshot}</span><br /><span className="text-xs">จำนวน {line.quantity} · {Number(line.total_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท {line.source_invoice_no ? `· ออกแล้วใน ${line.source_invoice_no}` : ""}</span></span>
    </label>)}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="field"><span className="field-label">หักภาษี ณ ที่จ่าย</span><select className="input" value={whtChoice} onChange={(e) => setWhtChoice(e.target.value)} disabled={pending}><option value="0">ไม่หัก</option><option value="1.5">1.5%</option><option value="3">3%</option><option value="5">5%</option><option value="custom">ระบุเอง</option></select></label>
      {whtChoice === "custom" && <label className="field"><span className="field-label">อัตราที่กำหนดเอง (%)</span><input className="input" inputMode="decimal" value={customWht} onChange={(e) => setCustomWht(e.target.value)} disabled={pending} placeholder="เช่น 2" /></label>}
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-sm">ยอดรายการที่เลือก: <b>{preview.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</b> บาท</span><button type="button" className="btn-primary" disabled={pending || selected.length === 0 || (whtChoice === "custom" && !customWht)} onClick={submit}>{pending ? "กำลังออกใบแจ้งหนี้..." : "ออกใบแจ้งหนี้"}</button></div>
    {error && <p className="mt-3 text-sm text-error" role="alert">{error}</p>}
  </div>;
}
