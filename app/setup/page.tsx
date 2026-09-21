import Link from "next/link";
import FullLogo from "@/components/layout/FullLogo";
import SetupForm from "@/app/setup/SetupForm";
import { isSetupAvailable } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const available = await isSetupAvailable();
  return (
    <main className="min-h-screen bg-[#f4f7fb] flex items-center justify-center p-4">
      <section className="panel w-full max-w-md p-6 sm:p-8">
        <div className="flex justify-center mb-6"><FullLogo /></div>
        <div className="text-center mb-6"><p className="page-kicker">การตั้งค่าครั้งแรก</p><h1 className="page-title text-2xl">สร้างผู้ดูแลระบบ</h1><p className="page-description">ตั้งค่าบัญชีแรกเพื่อเริ่มใช้งานระบบ</p></div>
        {available ? <SetupForm /> : <div className="text-center"><div className="notice">ระบบถูกตั้งค่าแล้ว การสมัครสมาชิกเปิดให้ผู้ดูแลระบบจัดการเท่านั้น</div><Link href="/auth/login" className="btn-primary inline-flex mt-5">ไปที่หน้าเข้าสู่ระบบ</Link></div>}
      </section>
    </main>
  );
}
