import type { Metadata } from "next";
import "./globals.css";
import { SidebarProvider } from "@/context/SidebarContext";

export const metadata: Metadata = {
  title: { default: "SRP Sales | จัดการงานขาย", template: "%s | SRP Sales" },
  description: "จัดการลูกค้า สินค้า ราคา และเอกสารการขายในที่เดียว",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#f4f7fb]">
        <SidebarProvider>{children}</SidebarProvider>
      </body>
    </html>
  );
}
