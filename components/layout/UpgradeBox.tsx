import React from "react";
import { Icon } from "@iconify/react";

export default function UpgradeBox() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-lightprimary via-white to-lightsecondary p-4 mt-6 border border-primary/20 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Icon icon="solar:crown-star-bold" className="size-6 text-primary animate-pulse" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-white shadow-xs">
          PRO
        </span>
      </div>
      <h4 className="text-sm font-bold text-dark mb-1">Upgrade to Pro</h4>
      <p className="text-xs text-bodytext mb-3 leading-relaxed">
        Get 80+ components, 10+ dashboards and priority 24/7 support.
      </p>
      <a
        href="https://wrappixel.com/templates/materialm-next-js-tailwind-dashboard-template/?ref=376"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-full py-2 px-3 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-emphasis transition-colors shadow-sm shadow-primary/20 gap-1.5"
      >
        <span>Check Features</span>
        <Icon icon="solar:arrow-right-linear" className="size-3.5" />
      </a>
    </div>
  );
}
