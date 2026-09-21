import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth";
import { listCustomers } from "@/lib/masters/queries";
import CustomerToggleForm from "@/app/customers/toggle-form";
import { PaginationControls, parsePagination } from "@/lib/pagination";

export default async function CustomersPage({ searchParams }: { searchParams?: Promise<{ q?: string; page?: string; pageSize?: string }> }) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};
  const search = params.q?.trim() ?? "";
  const pagination = parsePagination(params);
  const customers = await listCustomers(search, pagination);
  const canManage = user.role === "admin" || user.role === "manager" || user.role === "sales";
  return <AppLayout><div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="page-kicker">ข้อมูลหลัก</p><h1 className="page-title">ลูกค้า</h1><p className="page-description">จัดการข้อมูลลูกค้า ผู้ติดต่อ และเงื่อนไขการวางบิล</p></div>{canManage ? <Link className="btn-primary min-h-11 inline-flex items-center" href="/customers/new">+ เพิ่มลูกค้า</Link> : null}</div>
    <section className="panel"><form className="flex flex-col gap-3 sm:flex-row sm:items-end" method="get"><label className="field flex-1"><span className="field-label">ค้นหาลูกค้า</span><input className="input" name="q" defaultValue={search} placeholder="รหัส ชื่อ หรือผู้ติดต่อ" /></label><button className="btn-secondary min-h-11" type="submit">ค้นหา</button>{search ? <Link className="btn-secondary min-h-11 inline-flex items-center" href="/customers">ล้าง</Link> : null}</form></section>
    <section className="panel"><div className="panel-heading"><div><h2>รายการลูกค้า</h2><p>{customers.total} รายการ</p></div></div>
      {customers.rows.length === 0 ? <div className="empty-state">ยังไม่มีข้อมูลลูกค้าที่ตรงกับการค้นหา</div> : <><div className="table-wrap"><table className="data-table"><thead><tr><th>รหัส</th><th>ลูกค้า</th><th>ผู้ติดต่อ</th><th>เครดิต</th><th>สถานะ</th>{canManage ? <th className="text-right">จัดการ</th> : null}</tr></thead><tbody>{customers.rows.map((customer) => <tr key={customer.id}><td className="font-semibold">{customer.customer_code}</td><td><div className="font-semibold">{customer.legal_name}</div><div className="text-xs text-bodytext">{customer.branch_name}</div></td><td><div>{customer.contact_name || "—"}</div><div className="text-xs text-bodytext">{customer.contact_phone || customer.contact_email || ""}</div></td><td>{customer.credit_days == null ? "—" : `${customer.credit_days} วัน`}</td><td><span className={`badge ${customer.is_active ? "bg-lightsuccess text-success" : "bg-lightgray text-bodytext"}`}>{customer.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</span></td>{canManage ? <td><div className="flex justify-end gap-2"><Link className="btn-secondary min-h-11 inline-flex items-center" href={`/customers/${customer.id}/edit`}>แก้ไข</Link><CustomerToggleForm id={customer.id} label={customer.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"} /></div></td> : null}</tr>)}</tbody></table></div><PaginationControls pathname="/customers" query={{ q: search || undefined }} {...customers} /></>}
    </section>
  </div></AppLayout>;
}
