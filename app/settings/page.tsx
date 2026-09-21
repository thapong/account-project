import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import SettingsForm, { type CompanySettings } from "./settings-form";

export default async function SettingsPage() {
  await requireUser(["admin"]);
  const [settings] = await query<CompanySettings>('SELECT legal_name,tax_id,address,phone,email FROM company_settings WHERE id=true');
  return <AppLayout><div className="page-heading"><div><p className="page-kicker">WORKSPACE SETTINGS</p><h1 className="page-title">ข้อมูลบริษัท</h1><p className="page-description">ข้อมูลผู้ขายสำหรับเอกสารใหม่ เอกสารที่ออกแล้วจะเก็บข้อมูลเดิมไว้</p></div></div><SettingsForm settings={settings}/></AppLayout>;
}
