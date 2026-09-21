/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { getInvoice } from "@/lib/documents/queries";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const data = await getInvoice(id); if (!data) notFound();
  const { invoice, lines } = data;
  return <main className="mx-auto max-w-4xl bg-white p-8 text-slate-900 print:max-w-none">
    <div className="mb-8 flex justify-between border-b-2 border-slate-900 pb-5"><div><h1 className="text-2xl font-bold">{invoice.document_title}</h1><p className="mt-1 text-sm">{invoice.document_title} {invoice.invoice_no}</p></div><div className="text-right text-sm"><div>{invoice.seller_snapshot.legal_name}</div><div>{invoice.document_date}</div><div>ครบกำหนด {invoice.due_date || "-"}</div></div></div>
    <div className="mb-8 text-sm"><div className="font-semibold">ลูกค้า</div><div>{invoice.customer_snapshot.legal_name}</div><div>{invoice.customer_snapshot.address}</div></div>
    <table className="w-full border-collapse text-sm"><thead><tr><th className="border-b border-slate-300 p-2 text-left">รายการ</th><th className="border-b border-slate-300 p-2 text-right">จำนวน</th><th className="border-b border-slate-300 p-2 text-right">ราคา/หน่วย</th><th className="border-b border-slate-300 p-2 text-right">รวม</th></tr></thead><tbody>{lines.map((line: any) => <tr key={line.id}><td className="border-b border-slate-200 p-2">{line.name_snapshot}</td><td className="border-b border-slate-200 p-2 text-right">{line.quantity}</td><td className="border-b border-slate-200 p-2 text-right">{Number(line.unit_price_ex_vat).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td><td className="border-b border-slate-200 p-2 text-right">{Number(line.total_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td></tr>)}</tbody></table>
    <div className="mt-8 ml-auto w-64 space-y-2 text-right text-sm"><div>VAT {Number(invoice.vat_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</div><div className="border-t border-slate-900 pt-2 text-lg font-bold">รวมทั้งสิ้น {Number(invoice.grand_total).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</div></div>
    <p className="mt-16 text-center text-xs text-slate-500">เอกสารนี้เป็น{invoice.document_title}ตามขอบเขตระบบรุ่นแรก ยังไม่ใช่ใบกำกับภาษีหรือหลักฐานรับชำระเงิน</p>
  </main>;
}
