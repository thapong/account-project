import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { listQuotations } from "@/lib/documents/queries";
import { PaginationControls } from "@/lib/pagination";

const statusLabel: Record<string, string> = { draft: "แบบร่าง", sent: "ส่งแล้ว", accepted: "ตอบรับแล้ว", cancelled: "ยกเลิก" };
export default async function QuotationsPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = searchParams ? await searchParams : {};
  const result = await listQuotations(params);
  return <AppLayout><div className="page-heading"><div><div className="page-kicker">Sales documents</div><h1 className="page-title">ใบเสนอราคา</h1><p className="page-description">จัดทำราคา ส่งให้ลูกค้า และติดตามการตอบรับ โดยเอกสารที่ส่งแล้วจะถูกล็อกเนื้อหา</p></div><Link className="btn-primary" href="/quotations/new">+ สร้างใบเสนอราคา</Link></div><section className="panel"><div className="panel-heading"><span>รายการใบเสนอราคา</span><span className="text-sm font-normal text-bodytext">{result.total} รายการ</span></div>{result.rows.length === 0 ? <div className="empty-state">ยังไม่มีใบเสนอราคา <Link href="/quotations/new" className="font-semibold text-primary hover:underline">สร้างรายการแรก</Link></div> : <><div className="table-wrap"><table className="data-table"><thead><tr><th>เลขที่</th><th>ลูกค้า</th><th>ผู้รับผิดชอบ</th><th>วันที่</th><th>ยอดรวม</th><th>สถานะ</th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.id}><td><Link className="font-semibold text-primary hover:underline" href={`/quotations/${row.id}`}>{row.quotation_no}</Link></td><td>{row.customer_name}</td><td>{row.owner_name}</td><td>{row.document_date}</td><td className="font-semibold">{Number(row.grand_total).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td><td><span className="badge">{statusLabel[row.status] ?? row.status}</span></td></tr>)}</tbody></table></div><PaginationControls pathname="/quotations" page={result.page} pageSize={result.pageSize} total={result.total} /></>}</section></AppLayout>;
}
