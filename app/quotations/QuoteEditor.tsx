"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuotation, updateQuotation } from "@/lib/documents/actions";

type Customer = { id: string; customer_code: string; legal_name: string; branch_name: string };
type Product = { id: string; product_code: string; name: string; unit: string; description: string; warranty: string };
type Price = { id: string; product_id: string; product_code: string; product_name: string; selling_price: string; tax_basis: "exclusive" | "inclusive"; vat_rate: string; list_name: string };
type Line = { productId: string; sourcePriceListItemId: string; productCodeSnapshot: string; nameSnapshot: string; descriptionSnapshot: string; unitSnapshot: string; warrantySnapshot: string; quantity: string; unitPrice: string; taxBasis: "exclusive" | "inclusive"; vatRate: string; taxCode: "standard" | "zero" | "exempt"; lineDiscountAmount: string; whtRate: string };

const newLine = (): Line => ({ productId: "", sourcePriceListItemId: "", productCodeSnapshot: "", nameSnapshot: "", descriptionSnapshot: "", unitSnapshot: "ชิ้น", warrantySnapshot: "", quantity: "1", unitPrice: "0", taxBasis: "exclusive", vatRate: "7", taxCode: "standard", lineDiscountAmount: "0", whtRate: "0" });

type InitialQuote = { id?: string; customerId: string; documentDate: string; validUntil: string; documentDiscountAmount: string; paymentTerms: string; deliveryTerms: string; notes: string; lines: Partial<Line>[] };

export default function QuoteEditor({ customers, products, prices, initial }: { customers: Customer[]; products: Product[]; prices: Price[]; initial?: InitialQuote }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [documentDate, setDocumentDate] = useState(initial?.documentDate ?? new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [documentDiscountAmount, setDocumentDiscountAmount] = useState(initial?.documentDiscountAmount ?? "0");
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms ?? "");
  const [deliveryTerms, setDeliveryTerms] = useState(initial?.deliveryTerms ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(initial?.lines?.length ? initial.lines.map((line) => ({ ...newLine(), ...line })) : [newLine()]);
  const totalPreview = useMemo(() => lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0) - Number(documentDiscountAmount || 0), [lines, documentDiscountAmount]);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  }
  function chooseProduct(index: number, id: string) {
    const product = products.find((item) => item.id === id);
    updateLine(index, product ? { productId: product.id, sourcePriceListItemId: "", productCodeSnapshot: product.product_code, nameSnapshot: product.name, descriptionSnapshot: product.description, unitSnapshot: product.unit, warrantySnapshot: product.warranty } : { productId: "", sourcePriceListItemId: "" });
  }
  function choosePrice(index: number, id: string) {
    const price = prices.find((item) => item.id === id);
    const product = price ? products.find((item) => item.id === price.product_id) : undefined;
    updateLine(index, price ? { sourcePriceListItemId: price.id, productId: price.product_id, unitPrice: price.selling_price, taxBasis: price.tax_basis, vatRate: price.vat_rate, ...(product ? { productCodeSnapshot: product.product_code, nameSnapshot: product.name, descriptionSnapshot: product.description, unitSnapshot: product.unit, warrantySnapshot: product.warranty } : {}) } : { sourcePriceListItemId: "" });
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const form = new FormData();
    form.set("customerId", customerId); form.set("documentDate", documentDate); form.set("validUntil", validUntil);
    form.set("documentDiscountAmount", documentDiscountAmount); form.set("paymentTerms", paymentTerms); form.set("deliveryTerms", deliveryTerms); form.set("notes", notes);
    form.set("lines", JSON.stringify(lines));
    startTransition(async () => {
      const result = initial?.id ? await updateQuotation(initial.id, form) : await createQuotation(form);
      if (!result.ok) { setError(result.error); return; }
      setMessage(result.message ?? "บันทึกแล้ว"); router.push(`/quotations/${result.id}`); router.refresh();
    });
  }
  return <form onSubmit={submit} className="flex flex-col gap-6">
    {error && <div className="notice-error" role="alert">{error}</div>}
    {message && <div className="notice" role="status">{message}</div>}
    <section className="panel">
      <div className="panel-heading"><span>ข้อมูลใบเสนอราคา</span><span className="badge">สถานะ: แบบร่าง</span></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="field lg:col-span-2"><span className="field-label">ลูกค้า</span><select className="input" required value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">เลือกบริษัทลูกค้า</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customer_code} · {customer.legal_name} ({customer.branch_name})</option>)}</select></label>
        <label className="field"><span className="field-label">วันที่เอกสาร</span><input className="input" type="date" required value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} /></label>
        <label className="field"><span className="field-label">ใช้ได้ถึง</span><input className="input" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></label>
        <label className="field"><span className="field-label">ส่วนลดท้ายเอกสาร (บาท)</span><input className="input" inputMode="decimal" value={documentDiscountAmount} onChange={(e) => setDocumentDiscountAmount(e.target.value)} /></label>
        <label className="field lg:col-span-2"><span className="field-label">เงื่อนไขชำระเงิน</span><input className="input" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="เช่น เครดิต 30 วัน" /></label>
        <label className="field lg:col-span-2"><span className="field-label">เงื่อนไขส่งมอบ</span><input className="input" value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} /></label>
      </div>
    </section>
    <section className="panel">
      <div className="panel-heading"><span>รายการสินค้าและรายละเอียดที่จะพิมพ์ในใบเสนอราคา</span><button type="button" className="btn-secondary" onClick={() => setLines((current) => [...current, newLine()])}>+ เพิ่มรายการ</button></div>
      <div className="table-wrap"><table className="data-table min-w-[1280px]"><thead><tr><th>สินค้า / ราคาที่เผยแพร่</th><th>รายละเอียดในใบเสนอราคา</th><th>หน่วย</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>ฐานภาษี</th><th>VAT</th><th>ส่วนลด</th><th aria-label="ลบรายการ" /></tr></thead><tbody>{lines.map((line, index) => <tr key={index}>
        <td className="min-w-72"><label className="sr-only" htmlFor={`product-${index}`}>สินค้า</label><select id={`product-${index}`} className="input mb-2" required value={line.productId} onChange={(e) => chooseProduct(index, e.target.value)}><option value="">เลือกสินค้า</option>{products.map((product) => <option key={product.id} value={product.id}>{product.product_code} · {product.name}</option>)}</select><select className="input" value={line.sourcePriceListItemId} onChange={(e) => choosePrice(index, e.target.value)}><option value="">ราคา: กรอกเอง (ระบุฐานภาษี)</option>{prices.filter((price) => !line.productId || price.product_id === line.productId).map((price) => <option key={price.id} value={price.id}>{price.list_name} · {price.selling_price} ({price.tax_basis === "inclusive" ? "รวม VAT" : "ไม่รวม VAT"})</option>)}</select></td>
        <td className="min-w-80"><input className="input mb-2" value={line.productCodeSnapshot} onChange={(e) => updateLine(index, { productCodeSnapshot: e.target.value })} placeholder="รหัสสินค้า" /><input className="input mb-2" required value={line.nameSnapshot} onChange={(e) => updateLine(index, { nameSnapshot: e.target.value })} placeholder="ชื่อสินค้า/บริการ" /><textarea className="input min-h-20" value={line.descriptionSnapshot} onChange={(e) => updateLine(index, { descriptionSnapshot: e.target.value })} placeholder="รายละเอียดสินค้า/บริการ" /><input className="input mt-2" value={line.warrantySnapshot} onChange={(e) => updateLine(index, { warrantySnapshot: e.target.value })} placeholder="รับประกัน" /></td>
        <td><input className="input w-24" required value={line.unitSnapshot} onChange={(e) => updateLine(index, { unitSnapshot: e.target.value })} aria-label={`หน่วยรายการที่ ${index + 1}`} /></td>
        <td><label className="sr-only" htmlFor={`quantity-${index}`}>จำนวน</label><input id={`quantity-${index}`} className="input w-24" required inputMode="decimal" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} /></td>
        <td><label className="sr-only" htmlFor={`price-${index}`}>ราคา/หน่วย</label><input id={`price-${index}`} className="input w-32" required inputMode="decimal" value={line.unitPrice} onChange={(e) => updateLine(index, { unitPrice: e.target.value, sourcePriceListItemId: "" })} /></td>
        <td><label className="sr-only" htmlFor={`basis-${index}`}>ฐานภาษี</label><select id={`basis-${index}`} className="input w-32" value={line.taxBasis} onChange={(e) => updateLine(index, { taxBasis: e.target.value as Line["taxBasis"], sourcePriceListItemId: "" })}><option value="exclusive">ไม่รวม VAT</option><option value="inclusive">รวม VAT</option></select></td>
        <td><label className="sr-only" htmlFor={`vat-${index}`}>VAT</label><input id={`vat-${index}`} className="input w-20" inputMode="decimal" value={line.vatRate} onChange={(e) => updateLine(index, { vatRate: e.target.value, sourcePriceListItemId: "" })} /></td>
        <td><label className="sr-only" htmlFor={`discount-${index}`}>ส่วนลดรายการ</label><input id={`discount-${index}`} className="input w-24" inputMode="decimal" value={line.lineDiscountAmount} onChange={(e) => updateLine(index, { lineDiscountAmount: e.target.value })} /></td>
        <td><button type="button" className="btn-danger" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, i) => i !== index))} aria-label={`ลบรายการที่ ${index + 1}`}>ลบ</button></td>
      </tr>)}</tbody></table></div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><label className="field sm:max-w-xl flex-1"><span className="field-label">หมายเหตุ</span><textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} /></label><div className="rounded-xl bg-lightgray px-4 py-3 text-right text-sm"><div className="text-bodytext">ยอดประมาณการก่อน VAT/ส่วนลด</div><strong className="text-lg text-dark">{totalPreview.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</strong><div className="mt-1 text-xs text-bodytext">ยอดจริงคำนวณซ้ำบนเซิร์ฟเวอร์</div></div></div>
    </section>
    <div className="flex flex-wrap justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => router.push("/quotations")}>ยกเลิก</button><button type="submit" className="btn-primary" disabled={pending}>{pending ? "กำลังบันทึก…" : "บันทึกแบบร่าง"}</button></div>
  </form>;
}
