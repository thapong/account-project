import Link from "next/link";
import { ArrowRight, UsersRound, Package, FileText, ReceiptText, Plus, ListChecks } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const salesScope = user.role === 'sales';
  const [counts, quotes, recent, lists] = await Promise.all([
    query<{ customers: string; products: string }>(`SELECT (SELECT count(*) FROM customers WHERE is_active)::text AS customers,
      (SELECT count(*) FROM products WHERE is_active)::text AS products`),
    query<{ drafts: string; accepted: string; amount: string }>(`SELECT count(*) FILTER(WHERE q.status='draft')::text AS drafts,
      count(*) FILTER(WHERE q.status='accepted')::text AS accepted,
      COALESCE(sum(r.grand_total) FILTER(WHERE q.status IN ('sent','accepted')),0)::text AS amount
      FROM quotations q JOIN quotation_revisions r ON r.id=q.current_revision_id WHERE ($1=false OR q.owner_user_id=$2)`,[salesScope,user.id]),
    query<{ id: string; quotation_no: string; legal_name: string; status: string; grand_total: string; document_date: string }>(`SELECT q.id,q.quotation_no,
      r.customer_snapshot->>'legal_name' AS legal_name,q.status,r.grand_total::text,r.document_date::text
      FROM quotations q JOIN quotation_revisions r ON r.id=q.current_revision_id
      WHERE ($1=false OR q.owner_user_id=$2) ORDER BY q.created_at DESC LIMIT 6`,[salesScope,user.id]),
    query<{ count: string }>("SELECT count(*)::text FROM price_lists WHERE status='published' AND valid_from<=CURRENT_DATE AND (valid_to IS NULL OR valid_to>=CURRENT_DATE)"),
  ]);
  const money = (v: string) => Number(v).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const labels: Record<string,string> = { draft:'แบบร่าง',sent:'ส่งแล้ว',accepted:'ลูกค้ายืนยัน',cancelled:'ยกเลิก' };
  const cards = [
    {label:'ลูกค้าที่ใช้งาน',value:counts[0].customers,unit:'ราย',href:'/customers',icon:UsersRound,color:'bg-blue-50 text-blue-700'},
    {label:'สินค้าและบริการ',value:counts[0].products,unit:'รายการ',href:'/products',icon:Package,color:'bg-teal-50 text-teal-700'},
    {label:'ใบเสนอราคาร่าง',value:quotes[0].drafts,unit:'ฉบับ',href:'/quotations',icon:FileText,color:'bg-amber-50 text-amber-700'},
    {label:'ลูกค้ายืนยันแล้ว',value:quotes[0].accepted,unit:'ฉบับ',href:'/quotations',icon:ReceiptText,color:'bg-indigo-50 text-indigo-700'},
  ];
  return <AppLayout>
    <div className="page-heading"><div><p className="page-kicker">YOUR SALES WORKSPACE</p><h1 className="page-title">ภาพรวมงานขาย</h1><p className="page-description">สวัสดี {user.display_name} · เริ่มต้นงานวันนี้ด้วยข้อมูลและเอกสารที่อยู่ในระบบ</p></div><Link href="/quotations/new" className="btn-primary"><Plus size={18}/>สร้างใบเสนอราคา</Link></div>
    {params.error === 'forbidden' && <p role="alert" className="notice-error mb-5">บัญชีของคุณไม่มีสิทธิ์เข้าถึงหน้านั้น</p>}
    <section aria-label="ข้อมูลสรุป" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card=><Link key={card.href+card.label} href={card.href} className="panel group transition-shadow hover:shadow-md"><div className="mb-5 flex items-center justify-between"><span className={`flex size-11 items-center justify-center rounded-xl ${card.color}`}><card.icon size={22}/></span><ArrowRight size={16} className="text-bodytext transition-transform group-hover:translate-x-1"/></div><p className="text-sm text-bodytext">{card.label}</p><p className="mt-2 text-3xl font-bold tabular-nums">{card.value}<span className="ml-2 text-xs font-normal text-bodytext">{card.unit}</span></p></Link>)}</section>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="panel min-w-0"><div className="panel-heading"><div><h2>ใบเสนอราคาล่าสุด</h2><p className="mt-1 text-xs font-normal text-bodytext">{salesScope?'เอกสารที่คุณรับผิดชอบ':'รายการเอกสารของทีมขาย'}</p></div><Link href="/quotations" className="text-sm text-primary">ดูทั้งหมด →</Link></div>
        {recent.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>เอกสาร / ลูกค้า</th><th>วันที่</th><th>สถานะ</th><th className="text-right">ยอดสุทธิ</th></tr></thead><tbody>{recent.map(q=><tr key={q.id}><td><Link href={`/quotations/${q.id}`} className="font-semibold text-primary">{q.quotation_no}</Link><p className="mt-1 max-w-xs text-xs text-bodytext">{q.legal_name}</p></td><td className="whitespace-nowrap">{q.document_date}</td><td><span className="badge">{labels[q.status]}</span></td><td className="whitespace-nowrap text-right font-medium tabular-nums">฿{money(q.grand_total)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><FileText size={34} className="mx-auto mb-4 text-primary/60"/><p className="font-semibold text-dark">พร้อมสำหรับใบเสนอราคาแรก</p><p>เพิ่มลูกค้าและสินค้า แล้วเริ่มสร้างข้อเสนอของคุณ</p><Link href="/quotations/new" className="btn-secondary mt-5">สร้างใบเสนอราคา</Link></div>}
      </section>
      <div className="space-y-5"><section className="panel"><div className="mb-4 flex items-center gap-2"><ListChecks className="text-primary" size={20}/><h2 className="font-semibold">ขั้นตอนงานขาย</h2></div><ol className="space-y-4">{[['1','ลูกค้าและสินค้า','เตรียมข้อมูลให้พร้อม','/customers'],['2','ตรวจรายการราคา',`${lists[0].count} ชุดราคาที่มีผลวันนี้`,'/price-lists'],['3','ส่งใบเสนอราคา','บันทึกข้อเสนอและเงื่อนไข','/quotations'],['4','ออกเอกสารเรียกเก็บ','ใบแจ้งหนี้และใบวางบิล','/invoices']].map(([n,title,desc,href])=><li key={n}><Link href={href} className="flex gap-3 rounded-lg py-1"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-lightprimary text-xs font-bold text-primary">{n}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs text-bodytext">{desc}</p></div></Link></li>)}</ol></section>
      <section className="rounded-2xl bg-dark p-5 text-white"><p className="text-xs text-white/75">มูลค่าใบเสนอราคาที่ส่ง / ยืนยัน</p><p className="mt-3 break-words text-2xl font-bold tabular-nums">฿{money(quotes[0].amount)}</p><p className="mt-3 text-xs leading-5 text-white/70">ยอดตามเอกสารในระบบ ยังไม่ใช่ยอดรับชำระเงิน</p></section></div>
    </div>
  </AppLayout>;
}
