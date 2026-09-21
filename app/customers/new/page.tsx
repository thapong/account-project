import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth";
import CustomerForm from "@/app/customers/form";

export default async function NewCustomerPage() {
  const user = await requireUser(["admin", "manager", "sales"]);
  void user;
  return <AppLayout><div className="mx-auto max-w-4xl space-y-6"><div><Link className="text-sm text-primary hover:underline" href="/customers">← กลับรายการลูกค้า</Link><p className="page-kicker mt-5">ข้อมูลหลัก / ลูกค้า</p><h1 className="page-title">เพิ่มลูกค้า</h1><p className="page-description">กรอกข้อมูลที่ใช้บนใบเสนอราคาและการวางบิล</p></div><CustomerForm /></div></AppLayout>;
}
