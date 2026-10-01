"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto flex min-h-screen max-w-xl items-center px-5"><div className="panel w-full"><p className="page-kicker">ATOM SALES</p><h1 className="page-title">ยังโหลดข้อมูลไม่ได้</h1><p className="page-description mb-6">กรุณาลองอีกครั้ง หากยังพบปัญหา ให้ผู้ดูแลตรวจการเชื่อมต่อฐานข้อมูลและ migration</p><button className="btn-primary" onClick={reset}>ลองอีกครั้ง</button></div></main>;
}
