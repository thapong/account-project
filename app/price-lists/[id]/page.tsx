import { notFound } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth";
import { getPriceList, listActiveProducts } from "@/lib/masters/queries";
import { publishPriceListAction, retirePriceListAction } from "@/lib/masters/actions";
import { AddPriceListItemForm, ClonePriceListForm } from "@/app/price-lists/forms";
import MutationForm from "@/app/price-lists/mutation-form";

const statusLabel = { draft: "ฉบับร่าง", published: "เผยแพร่แล้ว", retired: "เลิกใช้" } as const;
const money = (value: string | null | undefined) => value == null ? "—" : Number(value).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function PriceListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const canManage = user.role === "admin" || user.role === "manager";
  const list = await getPriceList(id, user.role);
  if (!list || (!canManage && list.status !== "published")) notFound();
  const products = canManage && list.status === "draft" ? await listActiveProducts() : [];
  return <AppLayout><div className="space-y-6"><div><Link className="text-sm text-primary hover:underline" href="/price-lists">← กลับรายการราคา</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="page-kicker">ข้อมูลหลัก / รายการราคา</p><h1 className="page-title">{list.name}</h1><p className="page-description">{list.code} · เวอร์ชัน {list.version} · มีผล {list.valid_from}{list.valid_to ? ` ถึง ${list.valid_to}` : " เป็นต้นไป"}</p></div><span className={`badge ${list.status === "published" ? "bg-lightsuccess text-success" : list.status === "draft" ? "bg-lightwarning text-warning" : "bg-lightgray text-bodytext"}`}>{statusLabel[list.status]}</span></div></div>
    {canManage && list.status === "draft" ? <MutationForm action={publishPriceListAction.bind(null, list.id)}>เผยแพร่รายการราคา</MutationForm> : null}
    {canManage && list.status === "published" ? <MutationForm action={retirePriceListAction.bind(null, list.id)} tone="btn-danger">เลิกใช้รายการราคา</MutationForm> : null}
    <section className="panel"><div className="panel-heading"><div><h2>รายการสินค้าในฉบับนี้</h2><p>{list.items.length} รายการ · สกุลเงิน {list.currency}</p></div></div>{list.items.length === 0 ? <div className="empty-state">ยังไม่มีสินค้าในรายการราคานี้</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>สินค้า</th><th>ราคาขาย</th><th>ฐานภาษี</th><th>VAT</th><th>SRP</th>{canManage ? <th>ต้นทุน</th> : null}</tr></thead><tbody>{list.items.map((item) => <tr key={item.id}><td><div className="font-semibold">{item.product_name}</div><div className="text-xs text-bodytext">{item.product_code} · {item.unit}</div></td><td className="font-semibold">฿{money(item.selling_price)}</td><td>{item.tax_basis === "exclusive" ? "ไม่รวม VAT" : "รวม VAT"}</td><td>{item.vat_rate}%</td><td>{item.srp_price == null ? "—" : `฿${money(item.srp_price)}`}</td>{canManage ? <td>{item.cost_price == null ? "—" : `฿${money(item.cost_price)}`}</td> : null}</tr>)}</tbody></table></div>}</section>
    {canManage && list.status === "draft" ? <AddPriceListItemForm priceListId={list.id} products={products} canViewCost={canManage} /> : null}
    {canManage && list.status !== "draft" ? <ClonePriceListForm source={list} /> : null}
  </div></AppLayout>;
}
