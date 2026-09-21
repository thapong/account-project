import Link from "next/link";
import FullLogo from "@/components/layout/FullLogo";
import { logoutAction } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LogoutPage() {
  const user = await requireUser();
  return (
    <main className="min-h-screen bg-[#f4f7fb] flex items-center justify-center p-4">
      <section className="panel w-full max-w-md p-6 sm:p-8 text-center">
        <div className="flex justify-center mb-6"><FullLogo /></div>
        <p className="page-kicker">บัญชีผู้ใช้</p><h1 className="page-title text-2xl">ออกจากระบบ</h1>
        <p className="page-description mb-6">คุณกำลังใช้งานในชื่อ {user.display_name}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="btn-secondary justify-center">กลับไปหน้าหลัก</Link>
          <form action={logoutAction}><button type="submit" className="btn-danger w-full">ออกจากระบบ</button></form>
        </div>
      </section>
    </main>
  );
}
