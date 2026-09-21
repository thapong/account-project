"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createProductAction, updateProductAction } from "@/lib/masters/actions";
import type { MasterActionState, Product } from "@/lib/masters/types";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary min-h-11 disabled:opacity-60" disabled={pending} type="submit">{pending ? "กำลังบันทึก…" : label}</button>;
}
function ErrorText({ errors, name }: { errors?: Record<string, string[]>; name: string }) { return errors?.[name]?.[0] ? <p className="mt-1 text-xs text-error" role="alert">{errors[name][0]}</p> : null; }
const initialState: MasterActionState = {};

export default function ProductForm({ product }: { product?: Product }) {
  const action = product ? updateProductAction.bind(null, product.id) : createProductAction;
  const [state, formAction] = useActionState(action, initialState);
  return <form action={formAction} className="panel space-y-5">
    <div className="grid gap-4 md:grid-cols-2">
      <label className="field"><span className="field-label">รหัสสินค้า *</span><input className="input" name="productCode" defaultValue={product?.product_code} required /><ErrorText errors={state.fieldErrors} name="productCode" /></label>
      <label className="field"><span className="field-label">ชื่อสินค้า *</span><input className="input" name="name" defaultValue={product?.name} required /><ErrorText errors={state.fieldErrors} name="name" /></label>
      <label className="field"><span className="field-label">Model</span><input className="input" name="model" defaultValue={product?.model ?? ""} /></label>
      <label className="field"><span className="field-label">Vendor part</span><input className="input" name="vendorPart" defaultValue={product?.vendor_part ?? ""} /></label>
      <label className="field"><span className="field-label">ประเภท *</span><select className="input" name="kind" defaultValue={product?.kind ?? "hardware"}><option value="hardware">สินค้า</option><option value="service">บริการ</option><option value="subscription">สมาชิก/รายเดือน</option></select></label>
      <label className="field"><span className="field-label">หมวดหมู่</span><input className="input" name="category" defaultValue={product?.category ?? ""} /></label>
      <label className="field"><span className="field-label">หน่วย *</span><input className="input" name="unit" defaultValue={product?.unit ?? "ชิ้น"} required /></label>
      <label className="field"><span className="field-label">การรับประกัน</span><input className="input" name="warranty" defaultValue={product?.warranty ?? ""} /></label>
      <label className="field md:col-span-2"><span className="field-label">รายละเอียด</span><textarea className="input min-h-24" name="description" defaultValue={product?.description ?? ""} /></label>
    </div>
    {state.message && !state.ok ? <p className="notice-error" role="alert">{state.message}</p> : null}
    {state.message && state.ok ? <p className="notice" role="status">{state.message}</p> : null}
    <div className="flex flex-wrap gap-3"><SubmitButton label={product ? "บันทึกการแก้ไข" : "สร้างสินค้า"} /><a className="btn-secondary min-h-11 inline-flex items-center" href="/products">ยกเลิก</a></div>
  </form>;
}
