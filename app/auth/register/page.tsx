import Link from "next/link";
import FullLogo from "@/components/layout/FullLogo";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] flex items-center justify-center p-4">
      <section className="panel w-full max-w-md p-6 sm:p-8 text-center">
        <div className="flex justify-center mb-6"><FullLogo /></div>
        <p className="page-kicker">บัญชีผู้ใช้</p><h1 className="page-title text-2xl">การสมัครสมาชิกปิดอยู่</h1>
        <p className="page-description mb-6">ผู้ดูแลระบบสามารถสร้างบัญชีผู้ใช้เพิ่มเติมจากเมนูผู้ใช้งานหลังจากตั้งค่าระบบแล้ว</p>
        <Link href="/auth/login" className="btn-primary inline-flex w-full justify-center">กลับไปเข้าสู่ระบบ</Link>
      </section>
    </main>
  );
}
