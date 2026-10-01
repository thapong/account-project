"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createReceipt } from "./actions";

type Source = { id: string; invoice_no?: string; billing_note_no?: string; customer_name: string; amount: string | number };
type BankAccount = { bank_name: string; bank_branch: string; bank_account_no: string } | null;
type Method = "cash" | "bank_transfer" | "cheque";
type PaymentEntry = { key: number; paymentMethod: Method; amount: string; paymentDate: string };

const methods: { value: Method; label: string }[] = [
  { value: "cash", label: "เงินสด" },
  { value: "bank_transfer", label: "โอนเงิน" },
  { value: "cheque", label: "เช็คธนาคาร" },
];
function todayInBangkok() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function cents(value: string | number) { const number = Number(value); return Number.isFinite(number) ? Math.round(number * 100) : 0; }

export default function ReceiptCreateForm({ invoices, bills, initialInvoiceId, bankAccount }: { invoices: Source[]; bills: Source[]; initialInvoiceId?: string; bankAccount: BankAccount }) {
  const initialInvoice = invoices.find((row) => row.id === initialInvoiceId);
  const today = todayInBangkok();
  const [type, setType] = useState<"invoice" | "billing_note">("invoice");
  const [id, setId] = useState(initialInvoice?.id ?? "");
  const [nextKey, setNextKey] = useState(2);
  const [payments, setPayments] = useState<PaymentEntry[]>([{ key: 1, paymentMethod: "cash", amount: initialInvoice ? Number(initialInvoice.amount).toFixed(2) : "", paymentDate: today }]);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const rows = type === "invoice" ? invoices : bills;
  const selected = useMemo(() => rows.find((row) => row.id === id), [rows, id]);
  const maxAmount = selected ? cents(selected.amount) : 0;
  const totalCents = payments.reduce((sum, payment) => sum + cents(payment.amount), 0);
  const exceedsBalance = totalCents > maxAmount;
  const missingBankAccount = payments.some((payment) => payment.paymentMethod === "bank_transfer") && !bankAccount;

  function changeType(nextType: "invoice" | "billing_note") {
    setType(nextType);
    setId("");
    setPayments([{ key: 1, paymentMethod: "cash", amount: "", paymentDate: today }]);
    setNextKey(2);
  }
  function changeSource(nextId: string) {
    const next = rows.find((row) => row.id === nextId);
    setId(nextId);
    setPayments([{ key: 1, paymentMethod: "cash", amount: next ? Number(next.amount).toFixed(2) : "", paymentDate: today }]);
    setNextKey(2);
  }
  function updatePayment(key: number, patch: Partial<Omit<PaymentEntry, "key">>) {
    setPayments((current) => current.map((payment) => payment.key === key ? { ...payment, ...patch } : payment));
  }
  function addPayment() {
    const remaining = Math.max(0, maxAmount - totalCents);
    setPayments((current) => [...current, { key: nextKey, paymentMethod: "cash", amount: remaining ? (remaining / 100).toFixed(2) : "", paymentDate: today }]);
    setNextKey((current) => current + 1);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    form.set("payments", JSON.stringify(payments.map(({ paymentMethod, amount, paymentDate }) => ({ paymentMethod, amount: Number(amount), paymentDate }))));
    start(async () => {
      const result = await createReceipt(form);
      if (result.ok && result.id) router.push(`/receipts/${result.id}`);
      else setError(result.error ?? "สร้างใบเสร็จไม่สำเร็จ");
    });
  }

  return <form className="panel max-w-3xl space-y-6" onSubmit={submit}>
    <section className="space-y-4">
      <h2 className="text-base font-semibold">เอกสารต้นทาง</h2>
      <label className="field"><span className="field-label">ออกจาก</span><select className="input" value={type} onChange={(event) => changeType(event.target.value as "invoice" | "billing_note")}><option value="invoice">ใบแจ้งหนี้</option><option value="billing_note">ใบวางบิล</option></select></label>
      <label className="field"><span className="field-label">เอกสาร</span><select className="input" required name="sourceId" value={id} onChange={(event) => changeSource(event.target.value)}><option value="">เลือกเอกสารที่มียอดค้างชำระ</option>{rows.map((row) => <option key={row.id} value={row.id}>{type === "invoice" ? row.invoice_no : row.billing_note_no} · {row.customer_name} · คงเหลือ {Number(row.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</option>)}</select></label>
      <input type="hidden" name="sourceType" value={type} />
      {selected && <p className="text-sm text-bodytext">ยอดคงเหลือก่อนรับชำระ <strong>{Number(selected.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</strong></p>}
    </section>

    <section className="space-y-4 border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">การชำระเงิน</h2><button type="button" className="btn-secondary min-h-11" disabled={payments.length >= 10} onClick={addPayment}>＋ เพิ่มการชำระเงิน</button></div>
      {payments.map((payment, index) => <fieldset key={payment.key} className="space-y-4 rounded-md border border-border p-4">
        <legend className="px-1 text-sm font-semibold">รายการชำระ {index + 1}</legend>
        <fieldset className="field"><legend className="field-label">รูปแบบการชำระเงิน</legend><div className="flex flex-wrap gap-x-6 gap-y-2">{methods.map((method) => <label key={method.value} className="inline-flex min-h-11 items-center gap-2"><input type="radio" name={`payment-method-${payment.key}`} value={method.value} checked={payment.paymentMethod === method.value} onChange={() => updatePayment(payment.key, { paymentMethod: method.value })} />{method.label}</label>)}</div></fieldset>
        {payment.paymentMethod === "bank_transfer" && <label className="field"><span className="field-label">เข้าบัญชี</span><select className="input" disabled={!bankAccount}><option>{bankAccount ? `${bankAccount.bank_name} ${bankAccount.bank_account_no}${bankAccount.bank_branch ? ` (สาขา${bankAccount.bank_branch})` : ""}` : "ยังไม่ได้ระบุบัญชีธนาคารบริษัท"}</option></select>{!bankAccount && <span className="text-sm text-red-700">กรุณาเพิ่มบัญชีธนาคารในหน้าตั้งค่าบริษัทก่อน</span>}</label>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="field"><span className="field-label">ยอดชำระเงิน (บาท)</span><input className="input" name={`amount-${payment.key}`} type="number" min="0.01" step="0.01" max={selected ? (maxAmount / 100).toFixed(2) : undefined} required value={payment.amount} onChange={(event) => updatePayment(payment.key, { amount: event.target.value })} /></label><label className="field"><span className="field-label">วันที่รับเงิน</span><input className="input" name={`payment-date-${payment.key}`} type="date" required value={payment.paymentDate} onChange={(event) => updatePayment(payment.key, { paymentDate: event.target.value })} /></label></div>
        <label className="field"><span className="field-label">หลักฐานการชำระ <span className="font-normal text-bodytext">(ไม่บังคับ · PDF, JPG, PNG ไม่เกิน 4 MB รวม)</span></span><input className="input" name={`evidence-${index}`} type="file" accept="application/pdf,image/jpeg,image/png" /></label>
        {payments.length > 1 && <button type="button" className="min-h-11 text-sm text-red-700 underline" onClick={() => setPayments((current) => current.filter((item) => item.key !== payment.key))}>ลบรายการชำระนี้</button>}
      </fieldset>)}
      <div className="flex items-center justify-between border-t border-border pt-3"><span className="font-semibold">รวมยอดรับชำระ</span><span className="text-lg font-bold">{(totalCents / 100).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</span></div>
      {exceedsBalance && <p className="text-sm text-red-700" role="alert">ยอดรวมเกินยอดคงเหลือ {Number(selected?.amount ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</p>}
    </section>

    <section className="space-y-3 border-t border-border pt-5"><h2 className="text-base font-semibold">เอกสารอื่นๆ</h2><label className="field"><span className="field-label">โน้ตภายในบริษัท</span><textarea className="input min-h-24" name="internalNote" maxLength={2000} placeholder="บันทึกเพิ่มเติมสำหรับทีมงาน" /></label></section>
    {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
    <div className="flex justify-end border-t border-border pt-4"><button className="btn-primary min-h-11" disabled={!id || pending || exceedsBalance || missingBankAccount}>{pending ? "กำลังบันทึก..." : "บันทึกและออกใบเสร็จ"}</button></div>
  </form>;
}
