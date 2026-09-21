"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createCustomerAction, updateCustomerAction } from "@/lib/masters/actions";
import type { Customer, MasterActionState } from "@/lib/masters/types";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary min-h-11 disabled:opacity-60" disabled={pending} type="submit">{pending ? "กำลังบันทึก…" : label}</button>;
}

function ErrorText({ errors, name }: { errors?: Record<string, string[]>; name: string }) {
  return errors?.[name]?.[0] ? <p className="mt-1 text-xs text-error" role="alert">{errors[name][0]}</p> : null;
}

const initialState: MasterActionState = {};

export default function CustomerForm({ customer }: { customer?: Customer }) {
  const action = customer ? updateCustomerAction.bind(null, customer.id) : createCustomerAction;
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className="panel space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="field"><span className="field-label">รหัสลูกค้า *</span><input className="input" name="customerCode" defaultValue={customer?.customer_code} required /><ErrorText errors={state.fieldErrors} name="customerCode" /></label>
        <label className="field"><span className="field-label">ชื่อลูกค้า/นิติบุคคล *</span><input className="input" name="legalName" defaultValue={customer?.legal_name} required /><ErrorText errors={state.fieldErrors} name="legalName" /></label>
        <label className="field"><span className="field-label">เลขประจำตัวผู้เสียภาษี</span><input className="input" name="taxId" defaultValue={customer?.tax_id ?? ""} /></label>
        <label className="field"><span className="field-label">สาขา *</span><input className="input" name="branchName" defaultValue={customer?.branch_name ?? "สำนักงานใหญ่"} required /></label>
        <label className="field md:col-span-2"><span className="field-label">ที่อยู่</span><textarea className="input min-h-24" name="address" defaultValue={customer?.address ?? ""} /></label>
        <label className="field"><span className="field-label">ชื่อผู้ติดต่อ</span><input className="input" name="contactName" defaultValue={customer?.contact_name ?? ""} /></label>
        <label className="field"><span className="field-label">โทรศัพท์</span><input className="input" name="contactPhone" defaultValue={customer?.contact_phone ?? ""} /></label>
        <label className="field"><span className="field-label">อีเมลผู้ติดต่อ</span><input className="input" type="email" name="contactEmail" defaultValue={customer?.contact_email ?? ""} /><ErrorText errors={state.fieldErrors} name="contactEmail" /></label>
        <label className="field"><span className="field-label">เครดิต (วัน)</span><input className="input" type="number" min="0" name="creditDays" defaultValue={customer?.credit_days ?? ""} /></label>
        <label className="field"><span className="field-label">รอบวางบิล</span><input className="input" name="billingSchedule" defaultValue={customer?.billing_schedule ?? ""} /></label>
        <label className="field"><span className="field-label">เงื่อนไขรับชำระ</span><input className="input" name="paymentSchedule" defaultValue={customer?.payment_schedule ?? ""} /></label>
        <label className="field md:col-span-2"><span className="field-label">หมายเหตุ</span><textarea className="input min-h-20" name="notes" defaultValue={customer?.notes ?? ""} /></label>
      </div>
      {state.message && !state.ok ? <p className="notice-error" role="alert">{state.message}</p> : null}
      {state.message && state.ok ? <p className="notice" role="status">{state.message}</p> : null}
      <div className="flex flex-wrap gap-3"><SubmitButton label={customer ? "บันทึกการแก้ไข" : "สร้างลูกค้า"} /><a className="btn-secondary min-h-11 inline-flex items-center" href="/customers">ยกเลิก</a></div>
    </form>
  );
}
