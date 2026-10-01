/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import QuoteEditor from "../../QuoteEditor";
import { getQuotation, getQuotationFormOptions } from "@/lib/documents/queries";

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, options] = await Promise.all([getQuotation(id), getQuotationFormOptions()]);
  if (!data || data.quotation.quote_status !== "draft") notFound();
  const { quotation, lines } = data;
  return <AppLayout><div className="page-heading"><div><div className="page-kicker">Edit quotation {quotation.quotation_no}</div><h1 className="page-title">แก้ไขใบเสนอราคา {quotation.quotation_no}</h1><p className="page-description">แก้ไขรายละเอียดสินค้าในเอกสารได้จนกว่าจะส่งใบเสนอราคา</p></div></div><QuoteEditor {...options} initial={{ id, customerId: quotation.customer_id, documentDate: quotation.document_date, validUntil: quotation.valid_until ?? "", documentDiscountAmount: String(quotation.document_discount_amount ?? "0"), paymentTerms: quotation.payment_terms ?? "", deliveryTerms: quotation.delivery_terms ?? "", notes: quotation.notes ?? "", lines: lines.map((line: any) => ({ productId: line.product_id, sourcePriceListItemId: line.source_price_list_item_id ?? "", productCodeSnapshot: line.product_code_snapshot, nameSnapshot: line.name_snapshot, descriptionSnapshot: line.description_snapshot, unitSnapshot: line.unit_snapshot, warrantySnapshot: line.warranty_snapshot, quantity: String(line.quantity), unitPrice: String(line.input_unit_price), taxBasis: line.input_tax_basis, vatRate: String(line.vat_rate), taxCode: line.tax_code, lineDiscountAmount: String(line.line_discount_amount), whtRate: String(line.wht_rate) })) }} /></AppLayout>;
}
