import React from "react";
import AppLayout from "@/components/layout/AppLayout";

export default function SamplePage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-2xl p-6 border border-border/80 shadow-xs">
          <h2 className="text-xl font-bold text-dark mb-2">Sample Page</h2>
          <p className="text-xs text-bodytext leading-relaxed">
            This is an empty sample page container designed with MaterialM card styling, rounded borders, and clean layout guidelines. You can use this skeleton to build custom pages and modules.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
