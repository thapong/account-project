"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { MenuItem } from "@/types/navigation";

interface NavItemProps {
  item: MenuItem;
  onLinkClick?: () => void;
}

export default function NavItem({ item, onLinkClick }: NavItemProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Check if current item or child is active
  const isActive = item.url ? pathname === item.url : false;
  const isChildActive = item.children?.some((child) => pathname === child.url) || false;

  const hasChildren = Boolean(item.children && item.children.length > 0);

  if (hasChildren) {
    const isExpanded = isOpen || isChildActive;

    return (
      <div className="mb-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isExpanded)}
          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
            isChildActive
              ? "text-primary bg-lightprimary"
              : "text-dark hover:bg-lighthover hover:text-primary"
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon
              icon={item.icon}
              className={`size-5 transition-colors ${
                isChildActive ? "text-primary" : "text-bodytext group-hover:text-primary"
              }`}
            />
            <span>{item.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {item.isPro && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700">
                PRO
              </span>
            )}
            <Icon
              icon="solar:alt-arrow-down-linear"
              className={`size-4 transition-transform duration-200 text-bodytext ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {/* Accordion Sub-items */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out pl-4 pr-1 mt-1 flex flex-col gap-1 ${
            isExpanded ? "max-h-96 opacity-100 py-1" : "max-h-0 opacity-0 py-0"
          }`}
        >
          {item.children?.map((child, index) => {
            const isSubActive = pathname === child.url;
            const isExternal = child.url.startsWith("http");

            return (
              <a
                key={index}
                href={child.url}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                onClick={onLinkClick}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                  isSubActive
                    ? "text-primary bg-lightprimary font-semibold"
                    : "text-bodytext hover:text-dark hover:bg-lighthover"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`size-1.5 rounded-full transition-colors ${
                      isSubActive ? "bg-primary" : "bg-bodytext/40"
                    }`}
                  />
                  <span>{child.name}</span>
                </div>
                {child.isPro && (
                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-50 text-amber-600 border border-amber-200/60">
                    PRO
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  // Standalone link
  const isExternal = item.url?.startsWith("http");

  const linkContent = (
    <div
      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-primary text-white shadow-md shadow-primary/30"
          : "text-dark hover:bg-lighthover hover:text-primary"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          icon={item.icon}
          className={`size-5 transition-colors ${
            isActive ? "text-white" : "text-bodytext"
          }`}
        />
        <span>{item.name}</span>
      </div>
      {item.isPro && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            isActive
              ? "bg-white/20 text-white"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          PRO
        </span>
      )}
    </div>
  );

  if (isExternal) {
    return (
      <div className="mb-1">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onLinkClick}
          className="block"
        >
          {linkContent}
        </a>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <Link href={item.url || "/"} onClick={onLinkClick} className="block">
        {linkContent}
      </Link>
    </div>
  );
}
