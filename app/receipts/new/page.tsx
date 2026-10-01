/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import ReceiptCreateForm from "./form";

export default async function NewReceiptPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  await requireUser(["admin", "manager", "accounting"]);
  const params = searchParams ? await searchParams : {};
  const [invoices, bills, bankRows] = await Promise.all([
    query<any>(`SELECT i.id,i.invoice_no,i.customer_snapshot->>'legal_name' AS customer_name,(i.estimated_receivable-COALESCE((SELECT sum(r.amount) FROM receipts r WHERE r.invoice_id=i.id),0))::numeric(18,2) AS amount FROM invoices i WHERE i.status='issued' AND i.estimated_receivable>COALESCE((SELECT sum(r.amount) FROM receipts r WHERE r.invoice_id=i.id),0) ORDER BY i.document_date DESC`),
    query<any>(`SELECT b.id,b.billing_note_no,b.customer_snapshot->>'legal_name' AS customer_name,(b.total_amount-COALESCE((SELECT sum(r.amount) FROM receipts r WHERE r.billing_note_id=b.id),0))::numeric(18,2) AS amount FROM billing_notes b WHERE b.status='issued' AND b.total_amount>COALESCE((SELECT sum(r.amount) FROM receipts r WHERE r.billing_note_id=b.id),0) ORDER BY b.issued_at DESC`),
    query<{ bank_name: string; bank_branch: string; bank_account_no: string }>("SELECT bank_name,bank_branch,bank_account_no FROM company_settings WHERE id=true"),
  ]);
  const bank = bankRows[0];
  const bankAccount = bank?.bank_name && bank.bank_account_no ? bank : null;

  return <AppLayout><div className="page-heading"><div><h1 className="page-title">สร้างใบเสร็จ</h1><p className="page-description">เลือกเอกสารต้นทางและบันทึกรายละเอียดการรับชำระ</p></div><Link className="btn-secondary" href="/receipts">กลับรายการ</Link></div><ReceiptCreateForm invoices={invoices} bills={bills} initialInvoiceId={params.invoiceId} bankAccount={bankAccount} /></AppLayout>;
}
