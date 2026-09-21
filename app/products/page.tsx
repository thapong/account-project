import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth";
import { listProductsWithPrices } from "@/lib/masters/queries";
import ProductToggleForm from "@/app/products/toggle-form";
import { PaginationControls, parsePagination } from "@/lib/pagination";

export default async function ProductsPage({ searchParams }: { searchParams?: Promise<{ q?: string; page?: string; pageSize?: string }> }) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};
  const search = params.q?.trim() ?? "";
  const pagination = parsePagination(params);
  const products = await listProductsWithPrices(search, user.role, pagination);
  const canManage = user.role === "admin" || user.role === "manager";
  return <AppLayout><div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="page-kicker">ข้อมูลหลัก</p><h1 className="page-title">สินค้าและบริการ</h1><p className="page-description">รายการสินค้าที่ใช้ในใบเสนอราคาและรายการราคา</p></div>{canManage ? <Link className="btn-primary min-h-11 inline-flex items-center" href="/products/new">+ เพิ่มสินค้า</Link> : null}</div>
    <section className="panel"><form className="flex flex-col gap-3 sm:flex-row sm:items-end" method="get"><label className="field flex-1"><span className="field-label">ค้นหาสินค้า</span><input className="input" name="q" defaultValue={search} placeholder="รหัส Model หรือชื่อสินค้า" /></label><button className="btn-secondary min-h-11" type="submit">ค้นหา</button>{search ? <Link className="btn-secondary min-h-11 inline-flex items-center" href="/products">ล้าง</Link> : null}</form></section>
    <section className="panel"><div className="panel-heading"><div><h2>รายการสินค้า</h2><p>{products.total} รายการ · แสดงราคาจากรายการราคาล่าสุดที่เข้าถึงได้</p></div></div>{products.rows.length === 0 ? <div className="empty-state">ยังไม่มีข้อมูลสินค้าที่ตรงกับการค้นหา</div> : <><div className="table-wrap"><table className="data-table"><thead><tr><th>รหัส</th><th>สินค้า</th><th>ประเภท</th><th>หน่วย</th><th>ราคาขาย</th>{canManage ? <th>ต้นทุน</th> : null}<th>สถานะ</th>{canManage ? <th className="text-right">จัดการ</th> : null}</tr></thead><tbody>{products.rows.map((product) => <tr key={product.id}><td className="font-semibold">{product.product_code}</td><td><div className="font-semibold">{product.name}</div><div className="text-xs text-bodytext">{product.model || product.vendor_part || ""}</div>{product.price_list_name ? <div className="mt-1 text-xs text-bodytext">จาก {product.price_list_name}{product.price_list_status === "draft" ? " · ฉบับร่าง" : ""}</div> : null}</td><td>{{hardware:"สินค้า",service:"บริการ",subscription:"สมาชิก/รายเดือน"}[product.kind]}</td><td>{product.unit}</td><td className="font-semibold">{product.selling_price == null ? "—" : `฿${Number(product.selling_price).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>{canManage ? <td>{product.cost_price == null ? "—" : `฿${Number(product.cost_price).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td> : null}<td><span className={`badge ${product.is_active ? "bg-lightsuccess text-success" : "bg-lightgray text-bodytext"}`}>{product.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</span></td>{canManage ? <td><div className="flex justify-end gap-2"><Link className="btn-secondary min-h-11 inline-flex items-center" href={`/products/${product.id}/edit`}>แก้ไข</Link><ProductToggleForm id={product.id} label={product.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"} /></div></td> : null}</tr>)}</tbody></table></div><PaginationControls pathname="/products" query={{ q: search || undefined }} {...products} /></>}</section>
  </div></AppLayout>;
}
