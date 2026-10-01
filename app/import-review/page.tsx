import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth";
import { getProductImportReview } from "@/lib/masters/import-review";

const text = (value: unknown) => value == null || String(value).trim() === "" ? "—" : String(value);

export default async function ImportReviewPage() {
  await requireUser(["admin", "manager"]);
  const { batch, rows } = await getProductImportReview();
  return <AppLayout><div className="space-y-6"><div><p className="page-kicker">ข้อมูลหลัก / ตรวจสอบการนำเข้า</p><h1 className="page-title">ตรวจสอบรายการสินค้าที่ค้าง</h1><p className="page-description">แถวที่ไม่เข้าเงื่อนไขจะถูกเก็บไว้ให้ตรวจสอบก่อนนำเข้า โดยระบบไม่เปลี่ยนข้อมูลอัตโนมัติ</p></div>{!batch ? <section className="panel"><div className="empty-state">ยังไม่พบชุดข้อมูล Products.xlsx</div></section> : <><section className="panel"><div className="panel-heading"><div><h2>Products.xlsx</h2><p>นำเข้าแล้ว {batch.imported_count} รายการ · พบรายการรอตรวจสอบ {batch.issue_count} รายการ</p></div><span className={`badge ${batch.status === "needs_review" ? "bg-lightwarning text-warning" : "bg-lightsuccess text-success"}`}>{batch.status === "needs_review" ? "รอตรวจสอบ" : "เสร็จสมบูรณ์"}</span></div>{rows.length ? <div className="notice-error">รายการทั้งหมดเป็นประเภทที่ schema ปัจจุบันยังไม่รองรับ: EXPENSE จึงยังไม่ถูกสร้างเป็นสินค้าสำหรับขาย</div> : <div className="notice">ไม่พบรายการค้างจากการนำเข้าครั้งล่าสุด</div>}</section>{rows.length ? <section className="panel"><div className="panel-heading"><div><h2>รายการรอตรวจสอบ</h2><p>รวม {rows.length} รายการ · ข้อมูลต้นฉบับยังเก็บอยู่ในประวัติการนำเข้า</p></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>แถว</th><th>เลขสินค้า</th><th>ชื่อ</th><th>ประเภท</th><th>สถานะ</th><th>สาเหตุ</th></tr></thead><tbody>{rows.map((row) => <tr key={row.source_row}><td>{row.source_row}</td><td>{text(row.raw_data["เลขสินค้า"])}</td><td>{text(row.raw_data["ชื่อ"])}</td><td>{text(row.raw_data["ประเภท"])}</td><td>{text(row.raw_data["สถานะ"])}</td><td>{row.issues.join(", ")}</td></tr>)}</tbody></table></div></section> : null}</>}</div></AppLayout>;
}
