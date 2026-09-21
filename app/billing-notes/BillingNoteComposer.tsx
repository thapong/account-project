"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBillingNote } from "@/lib/documents/actions";

type InvoiceRow = {
  id: string;
  invoice_no: string;
  customer_id: string;
  customer_name: string;
  document_date: string;
  due_date: string | null;
  grand_total: string;
};

const money = (value: string) => Number(value).toLocaleString("th-TH", { minimumFractionDigits: 2 });

export default function BillingNoteComposer({ invoices }: { invoices: InvoiceRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedRows = useMemo(() => invoices.filter((invoice) => selected.includes(invoice.id)), [invoices, selected]);
  const customerIds = new Set(selectedRows.map((invoice) => invoice.customer_id));
  const total = selectedRows.reduce((sum, invoice) => sum + Number(invoice.grand_total), 0);
  const canSubmit = selected.length > 0 && customerIds.size === 1 && !isPending;

  function toggle(id: string) {
    setError("");
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function submit() {
    if (!canSubmit) {
      setError(customerIds.size > 1 ? "เลือกใบแจ้งหนี้ของลูกค้ารายเดียวกันต่อหนึ่งใบวางบิล" : "กรุณาเลือกใบแจ้งหนี้อย่างน้อยหนึ่งใบ");
      return;
    }
    startTransition(async () => {
      const result = await createBillingNote(selected);
      if (result.ok) {
        router.push(`/billing-notes/${result.id}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {invoices.length === 0 ? <div className="empty-state">ยังไม่มีใบแจ้งหนี้ที่พร้อมวางบิล</div> : <>
        <div className="table-wrap">
          <table className="data-table min-w-[780px]">
            <thead><tr><th className="w-12">เลือก</th><th>เลขที่</th><th>ลูกค้า</th><th>วันที่</th><th>ครบกำหนด</th><th className="text-right">ยอดรวม</th></tr></thead>
            <tbody>{invoices.map((invoice) => <tr key={invoice.id}>
              <td><input aria-label={`เลือก ${invoice.invoice_no}`} type="checkbox" checked={selected.includes(invoice.id)} onChange={() => toggle(invoice.id)} /></td>
              <td className="font-semibold">{invoice.invoice_no}</td><td>{invoice.customer_name}</td><td>{invoice.document_date}</td><td>{invoice.due_date || "-"}</td>
              <td className="text-right font-semibold">{money(invoice.grand_total)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-lightprimary/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-bodytext">เลือกแล้ว {selectedRows.length} ใบ{customerIds.size > 1 ? " · มีหลายลูกค้า" : ""}<div className="mt-1 text-lg font-bold text-dark">ยอดวางบิล {money(String(total))} บาท</div></div>
          <button type="button" className="btn-primary min-h-11" disabled={!canSubmit} onClick={submit}>{isPending ? "กำลังสร้าง..." : "สร้างใบวางบิล"}</button>
        </div>
      </>}
    </div>
  );
}
