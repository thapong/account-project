import AppLayout from "@/components/layout/AppLayout";
import QuoteEditor from "../QuoteEditor";
import { getQuotationFormOptions } from "@/lib/documents/queries";
export default async function NewQuotationPage() { const options = await getQuotationFormOptions(); return <AppLayout><div className="page-heading"><div><div className="page-kicker">New document</div><h1 className="page-title">สร้างใบเสนอราคา</h1><p className="page-description">ราคาที่เลือกจากรายการราคาจะถูกตรวจสอบอีกครั้งบนเซิร์ฟเวอร์ และจะเก็บ snapshot ของลูกค้า ผู้ขาย และสินค้าไว้กับเอกสาร</p></div></div><QuoteEditor {...options} /></AppLayout>; }
