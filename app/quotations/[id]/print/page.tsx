/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { getQuotation } from "@/lib/documents/queries";

const money = (value: unknown) => Number(value ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function QuotationPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getQuotation(id);
  if (!data) notFound();
  const { quotation, lines } = data;
  const contact = quotation.contact_snapshot ?? {};
  const seller = data.company ?? quotation.seller_snapshot;
  return <main className="mx-auto min-h-screen max-w-5xl bg-white px-10 py-8 text-[12px] leading-5 text-slate-900 print:max-w-none print:px-6 print:py-4">
    <header className="border-b-2 border-slate-900 pb-4">
      <div className="flex items-start justify-between gap-8">
        <div><div className="text-xl font-bold">{seller.legal_name}</div><div>{seller.address || "-"}</div><div>เลขประจำตัวผู้เสียภาษี: {seller.tax_id || "-"}</div><div>โทร. {seller.phone || "-"} · {seller.email || "-"}</div></div>
        <div className="min-w-64 text-right"><h1 className="text-3xl font-bold">ใบเสนอราคา</h1><div className="text-sm font-semibold">QUOTATION</div><div className="mt-2 grid grid-cols-2 gap-x-3 text-left"><span>เลขที่</span><strong>{quotation.quotation_no}</strong><span>วันที่</span><strong>{quotation.document_date}</strong><span>ใช้ได้ถึง</span><strong>{quotation.valid_until || "-"}</strong><span>สกุลเงิน</span><strong>{quotation.currency || "THB"}</strong></div></div>
      </div>
    </header>
    <section className="my-5 grid grid-cols-2 gap-5">
      <div className="rounded border border-slate-300 p-3"><div className="mb-1 font-bold">ลูกค้า / BILL TO</div><div className="font-semibold">{quotation.customer_snapshot.legal_name}</div><div>{quotation.customer_snapshot.branch_name || "-"}</div><div>{quotation.customer_snapshot.address || "-"}</div><div>เลขประจำตัวผู้เสียภาษี: {quotation.customer_snapshot.tax_id || "-"}</div></div>
      <div className="rounded border border-slate-300 p-3"><div className="mb-1 font-bold">ผู้ติดต่อและเงื่อนไข</div><div>ผู้ติดต่อ: {contact.name || "-"}</div><div>โทร. {contact.phone || "-"} · {contact.email || "-"}</div><div>เงื่อนไขชำระเงิน: {quotation.payment_terms || "-"}</div><div>เงื่อนไขส่งมอบ: {quotation.delivery_terms || "-"}</div></div>
    </section>
    <table className="w-full border-collapse text-[11px]"><thead><tr className="bg-sky-400 text-white"><th className="border border-slate-900 p-2 text-center">เลขที่<br/><span className="text-[9px]">No.</span></th><th className="border border-slate-900 p-2 text-left">รายการ<br/><span className="text-[9px]">Description</span></th><th className="border border-slate-900 p-2 text-center">จำนวน<br/><span className="text-[9px]">Quantity</span></th><th className="border border-slate-900 p-2 text-right">ราคา/หน่วย<br/><span className="text-[9px]">Unit Price</span></th><th className="border border-slate-900 p-2 text-right">จำนวนเงิน (THB)<br/><span className="text-[9px]">Amount</span></th></tr></thead><tbody>{lines.map((line: any) => <tr key={line.id} className="align-top"><td className="h-96 border border-slate-900 p-2 text-center">{line.line_no}</td><td className="whitespace-pre-wrap border border-slate-900 p-2"><div className="font-semibold">{line.product_code_snapshot ? `${line.product_code_snapshot} ` : ""}{line.name_snapshot}</div>{line.description_snapshot && <div>{line.description_snapshot}</div>}{line.warranty_snapshot && <div className="mt-1 text-[10px]">รับประกัน: {line.warranty_snapshot}</div>}</td><td className="border border-slate-900 p-2 text-center">{line.quantity}</td><td className="border border-slate-900 p-2 text-right">{money(line.unit_price_ex_vat)}</td><td className="border border-slate-900 p-2 text-right font-semibold">{money(line.total_amount)}</td></tr>)}</tbody></table>
    <section className="mt-0 flex justify-between gap-8"><div className="max-w-xl whitespace-pre-wrap"><div className="bg-slate-100 p-3 font-bold">จำนวนเงินเป็นตัวอักษร</div><div className="p-3 font-semibold">{quotation.notes || "-"}</div><div className="mt-4 font-bold">รายละเอียดและเงื่อนไข (Terms & Conditions)</div><div className="text-[10px]">{seller.legal_name}<br/>{seller.address || "-"}<br/>โทร. {seller.phone || "-"}</div></div><div className="w-80 space-y-1 text-right"><div className="flex justify-between border-b border-slate-200 p-2"><span>รวมเป็นเงิน</span><span>{money(quotation.subtotal)}</span></div><div className="flex justify-between border-b border-slate-200 p-2"><span>จำนวนภาษีมูลค่าเพิ่ม 7%</span><span>{money(quotation.vat_amount)}</span></div><div className="flex justify-between bg-sky-400 p-2 text-base font-bold text-white"><span>จำนวนเงินรวมทั้งสิ้น</span><span>{money(quotation.grand_total)}</span></div></div></section>
    <footer className="mt-10"><div className="mb-8 rounded bg-slate-50 p-3 text-sm"><b>ชำระเงินเข้าบัญชี:</b> {seller.bank_name || "-"} สาขา {seller.bank_branch || "-"} เลขที่บัญชี {seller.bank_account_no || "-"}</div><div className="grid grid-cols-2 gap-24 text-center"><div className="border-t border-slate-400 pt-2">ผู้เสนอราคา / ผู้จัดทำ</div><div className="border-t border-slate-400 pt-2">ผู้อนุมัติ / ลูกค้า</div></div></footer>
  </main>;
}
