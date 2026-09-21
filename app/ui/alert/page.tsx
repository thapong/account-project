import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Icon } from "@iconify/react";

export default function AlertPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-2xl p-5 border border-border/80">
          <h2 className="text-xl font-bold text-dark mb-1">Alerts</h2>
          <p className="text-xs text-bodytext">
            Feedback and notification alerts designed using MaterialM color tokens.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-border/80 shadow-xs flex flex-col gap-4">
          <h3 className="text-base font-bold text-dark mb-2">Theme Alerts</h3>

          {/* Primary Alert */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-lightprimary border border-primary/30 text-primary">
            <Icon icon="solar:info-circle-bold" className="size-5 shrink-0" />
            <div className="text-xs font-medium">
              <strong className="font-bold">Primary Notice:</strong> A new software update for MaterialM is now available.
            </div>
          </div>

          {/* Secondary Alert */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-lightsecondary border border-secondary/30 text-secondary-emphasis">
            <Icon icon="solar:bell-linear" className="size-5 shrink-0" />
            <div className="text-xs font-medium">
              <strong className="font-bold">Secondary Alert:</strong> Your cloud sync finished in 1.4 seconds.
            </div>
          </div>

          {/* Success Alert */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-lightsuccess border border-success/30 text-success">
            <Icon icon="solar:check-circle-bold" className="size-5 shrink-0" />
            <div className="text-xs font-medium">
              <strong className="font-bold">Success:</strong> Transaction completed successfully. Order receipt sent.
            </div>
          </div>

          {/* Warning Alert */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-lightwarning border border-warning/30 text-warning-emphasis">
            <Icon icon="solar:danger-triangle-bold" className="size-5 shrink-0" />
            <div className="text-xs font-medium">
              <strong className="font-bold">Warning:</strong> Your account storage is at 85% capacity.
            </div>
          </div>

          {/* Error Alert */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-lighterror border border-error/30 text-error">
            <Icon icon="solar:shield-cross-bold" className="size-5 shrink-0" />
            <div className="text-xs font-medium">
              <strong className="font-bold">Error:</strong> Unable to establish database connection. Please retry.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
