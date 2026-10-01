"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createManualInvoice } from "@/lib/documents/actions";

type Customer = { id: string; customer_code: string; legal_name: string; branch_name: string };
type Product = { id: string; product_code: string; name: string; unit: string; description: string; warranty: string };
type Line = { productId: string; productCodeSnapshot: string; nameSnapshot: string; descriptionSnapshot: string; unitSnapshot: string; quantity: string; unitPrice: string; taxBasis: "exclusive" | "inclusive"; vatRate: string; taxCode: "standard" | "zero" | "exempt"; lineDiscountAmount: string };
const newLine = (): Line => ({ productId: "", productCodeSnapshot: "", nameSnapshot: "", descriptionSnapshot: "", unitSnapshot: "ชิ้น", quantity: "1", unitPrice: "0", taxBasis: "exclusive", vatRate: "7", taxCode: "standard", lineDiscountAmount: "0" });

export default function ManualInvoiceForm({ customers, products }: { customers: Customer[]; products: Product[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [title, setTitle] = useState<"ใบแจ้งหนี้" | "Invoice">("ใบแจ้งหนี้");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [whtRate, setWhtRate] = useState("0");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  function updateLine(index: number, patch: Partial<Line>) { setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line)); }
  function chooseProduct(index: number, id: string) {
    const product = products.find((item) => item.id === id);
    updateLine(index, product ? { productId: id, productCodeSnapshot: product.product_code, nameSnapshot: product.name, descriptionSnapshot: product.description, unitSnapshot: product.unit } : { productId: "" });
  }
  function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const form = new FormData(); form.set("customerId", customerId); form.set("documentDate", documentDate); form.set("dueDate", dueDate); form.set("documentTitle", title); form.set("paymentTerms", paymentTerms); form.set("whtRate", whtRate); form.set("lines", JSON.stringify(lines.map((line) => ({ ...line, productId: line.productId || null }))));
    startTransition(async () => { const result = await createManualInvoice(form); if (!result.ok) setError(result.error); else router.push(`/invoices/${result.id}`); });
  }
  return <form onSubmit={submit} className="flex flex-col gap-6">
    {error && <div className="notice-error" role="alert">{error}</div>}
    <section className="panel"><div className="panel-heading"><span>ข้อมูลใบแจ้งหนี้</span><span className="badge">สร้างโดยตรง</span></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <label className="field lg:col-span-2"><span className="field-label">ลูกค้า</span><select className="input" required value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">เลือกลูกค้า</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.customer_code} · {c.legal_name} ({c.branch_name})</option>)}</select></label>
      <label className="field"><span className="field-label">ประเภทเอกสาร</span><select className="input" value={title} onChange={(e) => setTitle(e.target.value as typeof title)}><option>ใบแจ้งหนี้</option><option>Invoice</option></select></label>
      <label className="field"><span className="field-label">วันที่เอกสาร</span><input className="input" type="date" required value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} /></label>
      <label className="field"><span className="field-label">วันครบกำหนด</span><input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
      <label className="field"><span className="field-label">หัก ณ ที่จ่าย</span><select className="input" value={whtRate} onChange={(e) => setWhtRate(e.target.value)}><option value="0">ไม่หัก</option><option value="1.5">1.5%</option><option value="3">3%</option><option value="5">5%</option></select></label>
      <label className="field lg:col-span-2"><span className="field-label">เงื่อนไขชำระเงิน</span><input className="input" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="เช่น เครดิต 30 วัน" /></label>
    </div></section>
    <section className="panel"><div className="panel-heading"><span>รายการในใบแจ้งหนี้</span><button type="button" className="btn-secondary" onClick={() => setLines((current) => [...current, newLine()])}>+ เพิ่มรายการ</button></div><div className="table-wrap"><table className="data-table min-w-[1100px]"><thead><tr><th>สินค้า</th><th>รายละเอียด</th><th>หน่วย</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>VAT</th><th>ส่วนลด</th><th /></tr></thead><tbody>{lines.map((line, index) => <tr key={index}><td><select className="input min-w-52" value={line.productId} onChange={(e) => chooseProduct(index, e.target.value)}><option value="">กรอกเอง</option>{products.map((p) => <option key={p.id} value={p.id}>{p.product_code} · {p.name}</option>)}</select></td><td><input className="input mb-2 min-w-64" required value={line.nameSnapshot} onChange={(e) => updateLine(index, { nameSnapshot: e.target.value })} placeholder="ชื่อสินค้า/บริการ" /><textarea className="input min-w-64" value={line.descriptionSnapshot} onChange={(e) => updateLine(index, { descriptionSnapshot: e.target.value })} placeholder="รายละเอียด" /></td><td><input className="input w-20" value={line.unitSnapshot} onChange={(e) => updateLine(index, { unitSnapshot: e.target.value })} /></td><td><input className="input w-20" required inputMode="decimal" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} /></td><td><input className="input w-28" required inputMode="decimal" value={line.unitPrice} onChange={(e) => updateLine(index, { unitPrice: e.target.value })} /></td><td><input className="input w-20" inputMode="decimal" value={line.vatRate} onChange={(e) => updateLine(index, { vatRate: e.target.value })} /></td><td><input className="input w-24" inputMode="decimal" value={line.lineDiscountAmount} onChange={(e) => updateLine(index, { lineDiscountAmount: e.target.value })} /></td><td><button type="button" className="btn-danger" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>ลบ</button></td></tr>)}</tbody></table></div><div className="mt-4 flex justify-end"><button className="btn-primary" disabled={pending}>{pending ? "กำลังบันทึก…" : "สร้างใบแจ้งหนี้"}</button></div></section>
  </form>;
}
