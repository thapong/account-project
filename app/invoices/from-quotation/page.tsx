import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { listQuotationsForInvoicing } from "@/lib/documents/queries";
import { PaginationControls } from "@/lib/pagination";

type QuotationRow = {
  id: string; quotation_no: string; customer_name: string; document_date: string;
  valid_until: string | null; grand_total: string; line_count: number; remaining_line_count: number;
};

export default async function InvoiceFromQuotationPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const result = await listQuotationsForInvoicing(params);
  return <AppLayout>
    <div className="page-heading"><div><div className="page-kicker">Invoice workflow</div><h1 className="page-title">สร้างใบแจ้งหนี้จากใบเสนอราคา</h1><p className="page-description">เลือกใบเสนอราคาที่ลูกค้าตอบรับแล้ว และเลือกรายการที่จะนำไปออกใบแจ้งหนี้</p></div><Link className="btn-secondary" href="/invoices">กลับหน้าใบแจ้งหนี้</Link></div>
    <nav aria-label="เมนูใบแจ้งหนี้" className="mb-5 flex flex-wrap gap-2 border-b border-border pb-3"><Link className="rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-dark hover:border-primary hover:text-primary" href="/invoices/new">1. สร้างใบแจ้งหนี้</Link><Link className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white" href="/invoices/from-quotation">2. สร้างจากใบเสนอราคา</Link></nav>
    <section className="panel"><div className="panel-heading"><span>ใบเสนอราคาที่มีรายการค้างออกใบแจ้งหนี้</span><span className="text-sm font-normal text-bodytext">{result.total} รายการ</span></div>
      {result.rows.length === 0 ? <div className="empty-state">ยังไม่มีใบเสนอราคาที่พร้อมออกใบแจ้งหนี้</div> : <><div className="table-wrap"><table className="data-table min-w-[760px]"><thead><tr><th>เลขที่ใบเสนอราคา</th><th>ลูกค้า</th><th>วันที่</th><th>หมดอายุ</th><th>รายการคงเหลือ</th><th className="text-right">ยอดรวม</th><th /></tr></thead><tbody>{(result.rows as QuotationRow[]).map((row) => <tr key={row.id}><td className="font-semibold">{row.quotation_no}</td><td>{row.customer_name}</td><td>{row.document_date}</td><td>{row.valid_until || "-"}</td><td>{row.remaining_line_count} / {row.line_count} รายการ</td><td className="text-right font-semibold">{Number(row.grand_total).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td><td className="text-right"><Link className="btn-primary" href={`/invoices/from-quotation/${row.id}`}>เลือกรายการ</Link></td></tr>)}</tbody></table></div><PaginationControls pathname="/invoices/from-quotation" page={result.page} pageSize={result.pageSize} total={result.total} /></>}
    </section>
  </AppLayout>;
}