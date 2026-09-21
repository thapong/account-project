"use client";

import React from "react";
import { useSidebar } from "@/context/SidebarContext";
import { sidebarData } from "@/data/sidebarData";
import FullLogo from "./FullLogo";
import NavItem from "./NavItem";
import { Icon } from "@iconify/react";

export default function Sidebar() {
  const { isMobileOpen, closeMobile, isCollapsed } = useSidebar();

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between overflow-y-auto px-4 py-3">
      <div>
        {/* Logo Section */}
        <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-4">
          <FullLogo />
          {/* Mobile close button */}
          <button
            type="button"
            onClick={closeMobile}
            className="lg:hidden p-1.5 rounded-lg text-bodytext hover:text-dark hover:bg-lighthover transition-colors"
            aria-label="Close Sidebar"
          >
            <Icon icon="solar:close-circle-linear" className="size-6" />
          </button>
        </div>

        {/* Navigation Categories */}
        <nav className="flex flex-col gap-5">
          {sidebarData.map((group, groupIdx) => (
            <div key={groupIdx} className="sidebar-group">
              <h3 className="text-[11px] font-bold tracking-wider text-bodytext uppercase px-3 mb-2 select-none">
                {group.heading}
              </h3>
              <div className="flex flex-col">
                {group.children.map((item, itemIdx) => (
                  <NavItem key={itemIdx} item={item} onLinkClick={closeMobile} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Upgrade Box */}
      <div className="pb-4">
        {!isCollapsed && <div className="mt-8 rounded-xl bg-lightgray px-4 py-3 text-xs leading-5 text-bodytext">จัดการราคาและเอกสาร<br /><span className="font-semibold text-dark">ทุกขั้นตอนของงานขาย</span></div>}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Mobile Backdrop Overlay with Fade Animation */}
      <div
        className={`fixed inset-0 z-40 bg-dark/40 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
          isMobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMobile}
      />

      {/* 2. Mobile Slide Drawer (-translate-x-full to translate-x-0) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white border-r border-border shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* 3. Desktop Fixed / Sticky Sidebar */}
      <aside
        className={`hidden lg:block fixed top-0 left-0 bottom-0 z-30 bg-white border-r border-border transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
