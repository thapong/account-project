/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import BillingNoteActions from "../BillingNoteActions";
import { getBillingNote } from "@/lib/documents/queries";

const money = (value: string) => Number(value).toLocaleString("th-TH", { minimumFractionDigits: 2 });

export default async function BillingNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getBillingNote(id);
  if (!data) notFound();
  const { note, lines } = data;
  return <AppLayout>
    <div className="page-heading"><div><div className="page-kicker">Billing Note {note.billing_note_no}</div><h1 className="page-title">ใบวางบิล {note.billing_note_no}</h1><p className="page-description">{note.customer_snapshot.legal_name} · วันที่ {note.document_date} · {note.status === "issued" ? "ออกแล้ว" : "ยกเลิก"}</p></div><div className="flex flex-wrap gap-2"><Link className="btn-secondary" href={`/billing-notes/${id}/print`} target="_blank">พิมพ์ / Save PDF</Link><BillingNoteActions id={id} status={note.status} /></div></div>
    <section className="panel"><div className="mb-5 grid gap-4 sm:grid-cols-2"><div><div className="text-xs text-bodytext">ลูกค้า</div><div className="font-semibold">{note.customer_snapshot.legal_name}</div><div className="text-sm text-bodytext">{note.customer_snapshot.address}</div></div><div><div className="text-xs text-bodytext">ผู้ออกเอกสาร</div><div className="font-semibold">{note.seller_snapshot.legal_name}</div><div className="text-sm text-bodytext">วันที่นัดวางบิล: {note.appointment_date || "-"}</div></div></div>
      <div className="table-wrap"><table className="data-table min-w-[720px]"><thead><tr><th>#</th><th>ใบแจ้งหนี้</th><th>วันที่</th><th>ครบกำหนด</th><th className="text-right">ยอดที่วางบิล</th></tr></thead><tbody>{lines.map((line: any) => <tr key={line.id}><td>{line.line_no}</td><td className="font-semibold">{line.invoice_no_snapshot}</td><td>{line.invoice_date_snapshot}</td><td>{line.due_date_snapshot || "-"}</td><td className="text-right">{money(line.billed_amount)}</td></tr>)}</tbody></table></div>
      <div className="mt-6 ml-auto max-w-sm border-t border-border pt-3 text-right text-lg font-bold">รวมทั้งสิ้น {money(note.total_amount)} บาท</div>
    </section>
  </AppLayout>;
}
