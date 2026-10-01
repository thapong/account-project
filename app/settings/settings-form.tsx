"use client";
import { useActionState } from "react";
import { saveSettings } from "./actions";

export type CompanySettings = { legal_name: string; tax_id: string; address: string; phone: string; email: string; bank_name: string; bank_branch: string; bank_account_no: string };
export default function SettingsForm({ settings }: { settings: CompanySettings }) {
  const [state, action, pending] = useActionState(saveSettings, { message: "" });
  return <form action={action} className="panel max-w-3xl space-y-5">
    {state.message && <p role="status" className={state.success ? 'notice' : 'notice-error'}>{state.message}</p>}
    <div className="field"><label className="field-label" htmlFor="legal_name">ชื่อบริษัท / ชื่อผู้ขาย</label><input className="input" id="legal_name" name="legal_name" defaultValue={settings.legal_name} required maxLength={300}/></div>
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="field"><label className="field-label" htmlFor="tax_id">เลขประจำตัวผู้เสียภาษี</label><input className="input" id="tax_id" name="tax_id" defaultValue={settings.tax_id} maxLength={32}/></div>
      <div className="field"><label className="field-label" htmlFor="phone">โทรศัพท์</label><input className="input" id="phone" name="phone" defaultValue={settings.phone} maxLength={100}/></div>
    </div>
    <div className="field"><label className="field-label" htmlFor="address">ที่อยู่บนเอกสาร</label><textarea className="input" rows={3} id="address" name="address" defaultValue={settings.address} maxLength={2000}/></div>
    <div className="field"><label className="field-label" htmlFor="email">อีเมล</label><input className="input" id="email" name="email" type="email" defaultValue={settings.email}/></div>
    <div className="grid gap-5 sm:grid-cols-3"><div className="field"><label className="field-label" htmlFor="bank_name">ธนาคาร</label><input className="input" id="bank_name" name="bank_name" defaultValue={settings.bank_name} maxLength={200}/></div><div className="field"><label className="field-label" htmlFor="bank_branch">สาขา</label><input className="input" id="bank_branch" name="bank_branch" defaultValue={settings.bank_branch} maxLength={200}/></div><div className="field"><label className="field-label" htmlFor="bank_account_no">เลขที่บัญชี</label><input className="input" id="bank_account_no" name="bank_account_no" defaultValue={settings.bank_account_no} maxLength={100}/></div></div>
    <button disabled={pending} className="btn-primary">{pending ? 'กำลังบันทึก…' : 'บันทึกข้อมูลบริษัท'}</button>
  </form>;
}
