/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { getBillingNote } from "@/lib/documents/queries";

const money = (value: string) => Number(value).toLocaleString("th-TH", { minimumFractionDigits: 2 });

export default async function BillingNotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getBillingNote(id);
  if (!data) notFound();
  const { note, lines } = data;
  return <main className="mx-auto max-w-4xl bg-white p-8 text-slate-900 print:max-w-none"><div className="mb-8 flex justify-between border-b-2 border-slate-900 pb-5"><div><h1 className="text-2xl font-bold">ใบวางบิล</h1><p className="mt-1 text-sm">Billing Note {note.billing_note_no}</p></div><div className="text-right text-sm"><div>{note.seller_snapshot.legal_name}</div><div>{note.document_date}</div><div>นัดวางบิล {note.appointment_date || "-"}</div></div></div><div className="mb-8 text-sm"><div className="font-semibold">ลูกค้า</div><div>{note.customer_snapshot.legal_name}</div><div>{note.customer_snapshot.address}</div></div><table className="w-full border-collapse text-sm"><thead><tr><th className="border-b border-slate-300 p-2 text-left">ใบแจ้งหนี้</th><th className="border-b border-slate-300 p-2 text-left">วันที่</th><th className="border-b border-slate-300 p-2 text-left">ครบกำหนด</th><th className="border-b border-slate-300 p-2 text-right">ยอดที่วางบิล</th></tr></thead><tbody>{lines.map((line: any) => <tr key={line.id}><td className="border-b border-slate-200 p-2">{line.invoice_no_snapshot}</td><td className="border-b border-slate-200 p-2">{line.invoice_date_snapshot}</td><td className="border-b border-slate-200 p-2">{line.due_date_snapshot || "-"}</td><td className="border-b border-slate-200 p-2 text-right">{money(line.billed_amount)}</td></tr>)}</tbody></table><div className="mt-8 ml-auto w-64 border-t border-slate-900 pt-2 text-right text-lg font-bold">รวมทั้งสิ้น {money(note.total_amount)} บาท</div><p className="mt-16 text-center text-xs text-slate-500">เอกสารนี้ใช้ยืนยันรายการใบแจ้งหนี้ที่นำมาวางบิล ยังไม่ใช่หลักฐานการรับชำระเงิน</p></main>;
}
