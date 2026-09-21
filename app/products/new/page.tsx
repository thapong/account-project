import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth";
import ProductForm from "@/app/products/form";

export default async function NewProductPage() {
  const user = await requireUser(["admin", "manager"]);
  void user;
  return <AppLayout><div className="mx-auto max-w-4xl space-y-6"><div><Link className="text-sm text-primary hover:underline" href="/products">← กลับรายการสินค้า</Link><p className="page-kicker mt-5">ข้อมูลหลัก / สินค้า</p><h1 className="page-title">เพิ่มสินค้า</h1><p className="page-description">สร้างรายการสินค้าเพื่อใช้ในเอกสารขายและรายการราคา</p></div><ProductForm /></div></AppLayout>;
}
