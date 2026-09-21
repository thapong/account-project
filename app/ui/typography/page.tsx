import React from "react";
import AppLayout from "@/components/layout/AppLayout";

export default function TypographyPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-2xl p-5 border border-border/80">
          <h2 className="text-xl font-bold text-dark mb-1">Typography</h2>
          <p className="text-xs text-bodytext">
            Plus Jakarta Sans font weights, headings, and body scale.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-border/80 shadow-xs flex flex-col gap-6">
          <div>
            <span className="text-[11px] font-bold uppercase text-bodytext tracking-wider">
              Display Headings
            </span>
            <div className="space-y-4 mt-3">
              <h1 className="text-3xl font-extrabold text-dark tracking-tight">
                h1. MaterialM Dashboard Title (30px / SemiBold)
              </h1>
              <h2 className="text-2xl font-bold text-dark tracking-tight">
                h2. Section Title and Key Highlights (24px / Bold)
              </h2>
              <h3 className="text-xl font-bold text-dark">
                h3. Card Header and Grouping (20px / Bold)
              </h3>
              <h4 className="text-base font-semibold text-dark">
                h4. Item Titles and Subheadings (16px / SemiBold)
              </h4>
              <h5 className="text-sm font-semibold text-dark">
                h5. Table Header and Label (14px / SemiBold)
              </h5>
            </div>
          </div>

          <div className="border-t border-border/60 pt-5">
            <span className="text-[11px] font-bold uppercase text-bodytext tracking-wider">
              Body Copy and Text Colors
            </span>
            <div className="space-y-3 mt-3 text-xs leading-relaxed">
              <p className="text-dark font-medium">
                <strong>Dark Text (#1f2a3d):</strong> Used for primary content, headings, and high emphasis numbers.
              </p>
              <p className="text-bodytext">
                <strong>Body Text (#758390):</strong> Used for descriptions, subtitles, table meta information, and secondary details.
              </p>
              <p className="text-primary font-semibold">
                <strong>Primary Text (#00a1ff):</strong> Used for active links, buttons, highlights, and icons.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
