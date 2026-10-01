import Link from "next/link";
import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import InvoiceComposer from "@/app/quotations/InvoiceComposer";
import { getQuotationForInvoicing } from "@/lib/documents/queries";

export default async function InvoiceFromQuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getQuotationForInvoicing(id);
  if (!data) notFound();
  const { quotation, lines } = data;
  return <AppLayout>
    <div className="page-heading"><div><div className="page-kicker">Invoice from quotation</div><h1 className="page-title">เลือกสินค้าจากใบเสนอราคา {quotation.quotation_no}</h1><p className="page-description">{quotation.customer_name} · เลือกเฉพาะรายการที่ยังไม่เคยออกใบแจ้งหนี้</p></div><Link className="btn-secondary" href="/invoices/from-quotation">กลับรายการใบเสนอราคา</Link></div>
    <section className="panel"><div className="mb-5 grid gap-4 sm:grid-cols-2"><div><div className="text-xs text-bodytext">ลูกค้า</div><div className="font-semibold">{quotation.customer_name}</div><div className="text-sm text-bodytext">วันที่เอกสาร {quotation.document_date}</div></div><div><div className="text-xs text-bodytext">ใบเสนอราคา</div><div className="font-semibold">{quotation.quotation_no}</div><div className="text-sm text-bodytext">ยอดรวม {Number(quotation.grand_total).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</div></div></div><InvoiceComposer quotationId={id} lines={lines} /></section>
  </AppLayout>;
}
