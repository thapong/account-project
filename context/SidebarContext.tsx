"use client";

import React, { createContext, useContext, useState } from "react";
import { usePathname } from "next/navigation";

interface SidebarContextType {
  isMobileOpen: boolean;
  isCollapsed: boolean;
  toggleMobile: () => void;
  closeMobile: () => void;
  toggleCollapse: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close mobile sidebar on route change without triggering cascading effect render
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileOpen(false);
  }

  const toggleMobile = () => setIsMobileOpen((prev) => !prev);
  const closeMobile = () => setIsMobileOpen(false);
  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        isCollapsed,
        toggleMobile,
        closeMobile,
        toggleCollapse,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
