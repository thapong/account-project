import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import BillingNoteComposer from "./BillingNoteComposer";
import { listBillingNotes, listIssuedInvoicesForBilling } from "@/lib/documents/queries";
import { PaginationControls } from "@/lib/pagination";

export default async function BillingNotesPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const [result, existingNotes] = await Promise.all([listIssuedInvoicesForBilling(params), listBillingNotes(params)]);
  return <AppLayout>
    <div className="page-heading"><div><div className="page-kicker">Accounting</div><h1 className="page-title">ใบวางบิล</h1><p className="page-description">รวมใบแจ้งหนี้ของลูกค้ารายเดียวกันเพื่อออกเอกสารวางบิล ระบบยังไม่บันทึกการรับชำระเงิน</p></div><Link className="btn-secondary" href="/invoices">ดูใบแจ้งหนี้</Link></div>
    <section className="panel"><div className="panel-heading"><span>รายการใบวางบิล</span><span className="text-sm font-normal text-bodytext">{existingNotes.total} รายการ</span></div>{existingNotes.rows.length===0?<div className="empty-state">ยังไม่มีใบวางบิล</div>:<><div className="table-wrap"><table className="data-table"><thead><tr><th>เลขที่</th><th>ลูกค้า</th><th>วันที่</th><th>นัดวางบิล</th><th>จำนวนใบแจ้งหนี้</th><th>ยอดรวม</th><th>สถานะ</th><th aria-label="การทำงาน" /></tr></thead><tbody>{existingNotes.rows.map((note)=><tr key={note.id}><td><Link className="font-semibold text-primary hover:underline" href={`/billing-notes/${note.id}`}>{note.billing_note_no}</Link></td><td>{note.customer_name}</td><td>{note.document_date}</td><td>{note.appointment_date || "-"}</td><td>{note.invoice_count}</td><td>{Number(note.total_amount).toLocaleString("th-TH",{minimumFractionDigits:2})}</td><td><span className="badge">{note.status === "issued" ? "ออกแล้ว" : note.status === "cancelled" ? "ยกเลิก" : "แบบร่าง"}</span></td><td><Link className="text-primary hover:underline" href={`/billing-notes/${note.id}/print`} target="_blank">พิมพ์</Link></td></tr>)}</tbody></table></div><PaginationControls pathname="/billing-notes" page={existingNotes.page} pageSize={existingNotes.pageSize} total={existingNotes.total} /></>}</section><section className="panel mt-6"><div className="panel-heading"><span>ใบแจ้งหนี้ที่พร้อมวางบิล</span><span className="text-sm font-normal text-bodytext">{result.total} รายการ</span></div><BillingNoteComposer invoices={result.rows} /><PaginationControls pathname="/billing-notes" page={result.page} pageSize={result.pageSize} total={result.total} /></section>
  </AppLayout>;
}
