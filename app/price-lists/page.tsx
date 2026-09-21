import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth";
import { listPriceLists } from "@/lib/masters/queries";
import { PriceListCreateForm } from "@/app/price-lists/forms";
import { PaginationControls } from "@/lib/pagination";

const statusLabel = { draft: "ฉบับร่าง", published: "เผยแพร่แล้ว", retired: "เลิกใช้" } as const;
export default async function PriceListsPage({ searchParams }: { searchParams?: Promise<Record<string,string|undefined>> }) {
  const user = await requireUser();
  const canManage = user.role === "admin" || user.role === "manager";
  const params = searchParams ? await searchParams : {};
  const result = await listPriceLists(canManage, params);
  const lists = result.rows;
  return <AppLayout><div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="page-kicker">ข้อมูลหลัก</p><h1 className="page-title">รายการราคา</h1><p className="page-description">ราคาขายแยกตามฉบับและช่วงเวลาที่มีผล</p></div></div>{canManage ? <PriceListCreateForm /> : null}<section className="panel"><div className="panel-heading"><div><h2>รายการราคาที่เข้าถึงได้</h2><p>{result.total} รายการ</p></div></div>{lists.length === 0 ? <div className="empty-state">ยังไม่มีรายการราคาที่เผยแพร่</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>รหัส</th><th>ชื่อรายการ</th><th>เวอร์ชัน</th><th>ช่วงมีผล</th><th>รายการสินค้า</th><th>สถานะ</th><th className="text-right">ดูรายละเอียด</th></tr></thead><tbody>{lists.map((list) => <tr key={list.id}><td className="font-semibold">{list.code}</td><td>{list.name}</td><td>v{list.version}</td><td>{list.valid_from}{list.valid_to ? ` – ${list.valid_to}` : " เป็นต้นไป"}</td><td>{list.item_count ?? 0}</td><td><span className={`badge ${list.status === "published" ? "bg-lightsuccess text-success" : list.status === "draft" ? "bg-lightwarning text-warning" : "bg-lightgray text-bodytext"}`}>{statusLabel[list.status]}</span></td><td className="text-right"><Link className="btn-secondary min-h-11 inline-flex items-center" href={`/price-lists/${list.id}`}>เปิด</Link></td></tr>)}</tbody></table></div>}<PaginationControls pathname="/price-lists" page={result.page} pageSize={result.pageSize} total={result.total} /></section></div></AppLayout>;
}
