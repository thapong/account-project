import FullLogo from "@/components/layout/FullLogo";
import LoginForm from "@/app/auth/login/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] flex items-center justify-center p-4">
      <section className="panel w-full max-w-md p-6 sm:p-8">
        <div className="flex justify-center mb-6"><FullLogo /></div>
        <div className="text-center mb-6"><p className="page-kicker">SRP SALES</p><h1 className="page-title text-2xl">เข้าสู่ระบบ</h1><p className="page-description">จัดการงานขาย ลูกค้า และเอกสารของคุณ</p></div>
        <LoginForm />
      </section>
    </main>
  );
}
