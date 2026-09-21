"use client";
import { Menu, PanelLeftClose, FilePlus2, CircleUserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useEffect, useState } from "react";
import { sidebarData } from "@/data/sidebarData";

export default function Header() {
  const { toggleMobile, toggleCollapse } = useSidebar();
  const pathname = usePathname();
  const current = sidebarData.flatMap(g => g.children).find(i => i.url === pathname || (i.url !== "/" && i.url && pathname.startsWith(i.url)));
  const [name, setName] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/me', { signal: controller.signal }).then(r => r.ok ? r.json() : null).then(data => setName(data?.user?.display_name ?? data?.display_name ?? "")).catch(() => {});
    return () => controller.abort();
  }, []);
  return <header className="sticky top-0 z-20 border-b border-border/80 bg-white/95 px-4 py-3 backdrop-blur-md lg:px-7">
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={toggleMobile} aria-label="เปิดเมนู" className="flex size-11 items-center justify-center rounded-xl hover:bg-lightgray lg:hidden"><Menu size={21} /></button>
        <button type="button" onClick={toggleCollapse} aria-label="ย่อหรือขยายเมนู" className="hidden size-11 items-center justify-center rounded-xl hover:bg-lightgray lg:flex"><PanelLeftClose size={20} /></button>
        <div className="min-w-0"><p className="text-[11px] font-medium tracking-wider text-bodytext">SRP SALES WORKSPACE</p><p className="truncate text-sm font-semibold">{current?.name ?? "จัดการงานขาย"}</p></div>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/quotations/new" className="hidden items-center gap-2 rounded-xl bg-lightprimary px-3 py-2.5 text-sm font-semibold text-primary sm:inline-flex"><FilePlus2 size={17} /> สร้างใบเสนอราคา</Link>
        <Link href="/auth/logout" className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm" aria-label="ข้อมูลบัญชีและออกจากระบบ"><CircleUserRound size={22} className="text-primary" /><span className="hidden max-w-32 truncate md:inline">{name || "บัญชีผู้ใช้"}</span></Link>
      </div>
    </div>
  </header>;
}
