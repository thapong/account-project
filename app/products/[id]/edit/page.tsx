import { notFound } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth";
import { getProduct } from "@/lib/masters/queries";
import ProductForm from "@/app/products/form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["admin", "manager"]);
  void user;
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  return <AppLayout><div className="mx-auto max-w-4xl space-y-6"><div><Link className="text-sm text-primary hover:underline" href="/products">← กลับรายการสินค้า</Link><p className="page-kicker mt-5">ข้อมูลหลัก / สินค้า</p><h1 className="page-title">แก้ไขสินค้า</h1><p className="page-description">{product.name} · {product.product_code}</p></div><ProductForm product={product} /></div></AppLayout>;
}
