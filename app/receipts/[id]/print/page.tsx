import { notFound } from "next/navigation";
import { getReceipt } from "@/lib/receipts";

const paymentLabels: Record<string, string> = { cash: "เงินสด", bank_transfer: "โอนเงิน", cheque: "เช็คธนาคาร" };
type ReceiptPayment = { id: string; payment_method: string; payment_date: string; amount: string | number; bank_account_snapshot: { bank_name?: string; bank_branch?: string; bank_account_no?: string } | null };

export default async function ReceiptPrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await getReceipt(id);
  if (!receipt) notFound();
  const payments = receipt.payments as ReceiptPayment[];
  return <main className="document-print mx-auto min-h-[297mm] w-[210mm] bg-white p-[18mm] text-slate-900">
    <header className="mb-10 flex justify-between border-b-2 border-slate-900 pb-5"><div><h1 className="text-2xl font-bold">{receipt.seller_snapshot.legal_name}</h1><div>{receipt.seller_snapshot.address}</div><div>เลขประจำตัวผู้เสียภาษี: {receipt.seller_snapshot.tax_id || "-"}</div></div><div className="shrink-0 text-right"><h2 className="whitespace-nowrap text-xl font-bold">ใบเสร็จรับเงิน</h2><div>เลขที่ {receipt.receipt_no}</div><div>วันที่ {receipt.receipt_date_text}</div></div></header>
    <section className="mb-8"><b>ผู้ชำระเงิน</b><div>{receipt.customer_snapshot.legal_name}</div><div>{receipt.customer_snapshot.address}</div></section>
    <table className="w-full border-collapse border border-slate-900"><thead><tr><th className="border border-slate-900 p-3 text-left">รายการ</th><th className="border border-slate-900 p-3 text-right">จำนวนเงิน (บาท)</th></tr></thead><tbody><tr><td className="border border-slate-900 p-5">รับชำระตาม {receipt.invoice_no ?? receipt.billing_note_no}</td><td className="border border-slate-900 p-5 text-right">{Number(receipt.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td></tr></tbody></table>
    <section className="mt-7"><b>รายละเอียดการชำระเงิน</b><table className="mt-2 w-full border-collapse border border-slate-900 text-sm"><thead><tr><th className="border border-slate-900 p-2 text-left">วิธีชำระ / บัญชี</th><th className="border border-slate-900 p-2 text-left">วันที่รับเงิน</th><th className="border border-slate-900 p-2 text-right">จำนวนเงิน (บาท)</th></tr></thead><tbody>{payments.map((payment) => { const bank = payment.bank_account_snapshot; return <tr key={payment.id}><td className="border border-slate-900 p-2">{paymentLabels[payment.payment_method] ?? "-"}{bank && <div>{bank.bank_name} {bank.bank_account_no}{bank.bank_branch ? ` (สาขา${bank.bank_branch})` : ""}</div>}</td><td className="border border-slate-900 p-2">{payment.payment_date}</td><td className="border border-slate-900 p-2 text-right">{Number(payment.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td></tr>; })}</tbody></table></section>
    <div className="mt-8 ml-auto w-64 border-t-2 border-slate-900 pt-3 text-right text-xl font-bold">รวม {Number(receipt.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</div>
  </main>;
}
