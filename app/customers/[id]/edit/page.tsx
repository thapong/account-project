import { notFound } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth";
import { getCustomer } from "@/lib/masters/queries";
import CustomerForm from "@/app/customers/form";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["admin", "manager", "sales"]);
  void user;
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  return <AppLayout><div className="mx-auto max-w-4xl space-y-6"><div><Link className="text-sm text-primary hover:underline" href="/customers">← กลับรายการลูกค้า</Link><p className="page-kicker mt-5">ข้อมูลหลัก / ลูกค้า</p><h1 className="page-title">แก้ไขลูกค้า</h1><p className="page-description">{customer.legal_name} · {customer.customer_code}</p></div><CustomerForm customer={customer} /></div></AppLayout>;
}
