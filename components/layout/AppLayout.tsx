"use client";

import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useSidebar } from "@/context/SidebarContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-dark flex">
      {/* Sidebar (Desktop + Mobile Slide Drawer) */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <Header />

        <main className="flex-1 p-4 lg:p-7 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="py-5 px-6 border-t border-border/60 text-center text-xs text-bodytext">
          SRP Sales · พื้นที่ทำงานฝ่ายขาย <span className="sr-only"> Template by{" "}
          <a
            href="https://wrappixel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-semibold hover:underline"
          >
            WrapPixel
          </a>{" "}
          </span>
        </footer>
      </div>
    </div>
  );
}
