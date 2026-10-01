import Link from "next/link";
import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { getReceipt } from "@/lib/receipts";

const paymentLabels: Record<string, string> = { cash: "เงินสด", bank_transfer: "โอนเงิน", cheque: "เช็คธนาคาร" };
type ReceiptPayment = { id: string; payment_method: string; payment_date: string; amount: string | number; evidence_filename: string | null; bank_account_snapshot: { bank_name?: string; bank_branch?: string; bank_account_no?: string } | null };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await getReceipt(id);
  if (!receipt) notFound();
  const payments = receipt.payments as ReceiptPayment[];
  return <AppLayout><div className="page-heading"><div><h1 className="page-title">ใบเสร็จ {receipt.receipt_no}</h1><p className="page-description">{receipt.customer_snapshot.legal_name}</p></div><Link className="btn-secondary" href={`/receipts/${id}/print`} target="_blank">พิมพ์ / Save PDF</Link></div>
    <section className="panel space-y-5">
      <div className="grid gap-4 sm:grid-cols-2"><div><div className="field-label">อ้างอิงเอกสาร</div><div>{receipt.invoice_no ?? receipt.billing_note_no}</div></div><div><div className="field-label">วันที่ออกใบเสร็จ</div><div>{receipt.receipt_date_text}</div></div></div>
      <div className="border-t border-border pt-4"><h2 className="mb-3 text-base font-semibold">รายละเอียดการชำระเงิน</h2><div className="space-y-4">{payments.map((payment, index) => { const bank = payment.bank_account_snapshot; return <div className="rounded-md border border-border p-4" key={payment.id}><div className="mb-3 font-semibold">รายการชำระ {index + 1}</div><div className="grid gap-4 sm:grid-cols-2"><div><div className="field-label">รูปแบบการชำระเงิน</div><div>{paymentLabels[payment.payment_method] ?? "-"}</div></div><div><div className="field-label">วันที่รับเงิน</div><div>{payment.payment_date}</div></div>{bank && <div className="sm:col-span-2"><div className="field-label">เข้าบัญชี</div><div>{bank.bank_name} {bank.bank_account_no}{bank.bank_branch ? ` (สาขา${bank.bank_branch})` : ""}</div></div>}<div><div className="field-label">ยอดชำระเงิน</div><div className="font-semibold">{Number(payment.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</div></div><div><div className="field-label">หลักฐานการชำระ</div>{payment.evidence_filename ? <Link className="text-primary underline" href={`/receipts/${id}/payments/${payment.id}/evidence`}>{payment.evidence_filename}</Link> : <div>-</div>}</div></div></div>; })}</div><div className="mt-4 text-right text-xl font-bold">รวม {Number(receipt.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</div></div>
      <div className="border-t border-border pt-4"><div className="field-label">โน้ตภายในบริษัท</div><p className="whitespace-pre-wrap">{receipt.internal_note || "-"}</p></div>
    </section>
  </AppLayout>;
}
