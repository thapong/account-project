import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import BillingNoteComposer from "./BillingNoteComposer";
import { listIssuedInvoicesForBilling } from "@/lib/documents/queries";
import { PaginationControls } from "@/lib/pagination";

export default async function BillingNotesPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const result = await listIssuedInvoicesForBilling(params);
  return <AppLayout>
    <div className="page-heading"><div><div className="page-kicker">Accounting</div><h1 className="page-title">ใบวางบิล</h1><p className="page-description">รวมใบแจ้งหนี้ของลูกค้ารายเดียวกันเพื่อออกเอกสารวางบิล ระบบยังไม่บันทึกการรับชำระเงิน</p></div><Link className="btn-secondary" href="/invoices">ดูใบแจ้งหนี้</Link></div>
    <section className="panel"><div className="panel-heading"><span>ใบแจ้งหนี้ที่พร้อมวางบิล</span><span className="text-sm font-normal text-bodytext">{result.total} รายการ</span></div><BillingNoteComposer invoices={result.rows} /><PaginationControls pathname="/billing-notes" page={result.page} pageSize={result.pageSize} total={result.total} /></section>
  </AppLayout>;
}
