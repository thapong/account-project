import React from "react";
import { Icon } from "@iconify/react";

interface Activity {
  time: string;
  title: string;
  subtitle?: string;
  color: "primary" | "secondary" | "success" | "warning" | "error";
  linkText?: string;
}

const activities: Activity[] = [
  {
    time: "09:30 am",
    title: "Payment received from John Doe",
    subtitle: "฿12,500 for UI/UX Design project",
    color: "primary",
  },
  {
    time: "10:00 am",
    title: "New sale recorded",
    subtitle: "#ML-3467 MaterialM NextJs Pro",
    color: "success",
    linkText: "#ML-3467",
  },
  {
    time: "12:15 pm",
    title: "Payment processed to server host",
    subtitle: "Cloud hosting recurring renewal",
    color: "warning",
  },
  {
    time: "02:45 pm",
    title: "Project milestone completed",
    subtitle: "Dashboard slide menu & animations",
    color: "secondary",
  },
  {
    time: "04:20 pm",
    title: "Refund requested",
    subtitle: "Customer feedback received",
    color: "error",
  },
];

const dotColors = {
  primary: "ring-primary text-primary",
  secondary: "ring-secondary text-secondary",
  success: "ring-success text-success",
  warning: "ring-warning text-warning",
  error: "ring-error text-error",
};

export default function Transactions() {
  return (
    <div className="bg-white rounded-2xl p-5 lg:p-6 border border-border/80 shadow-xs h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-dark">Recent Transactions</h3>
            <p className="text-xs text-bodytext">Activity and logs for today</p>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg text-bodytext hover:text-dark hover:bg-lighthover transition-colors"
          >
            <Icon icon="solar:menu-dots-bold" className="size-5" />
          </button>
        </div>

        {/* Timeline Items */}
        <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/70">
          {activities.map((item, idx) => (
            <div key={idx} className="relative group">
              {/* Status Circle Marker */}
              <div
                className={`absolute -left-6 top-1 size-2.5 rounded-full bg-white ring-4 ${
                  dotColors[item.color]
                } transition-transform group-hover:scale-125`}
              />
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-dark leading-tight">
                    {item.title}
                  </h4>
                  <span className="text-[11px] font-semibold text-bodytext">
                    {item.time}
                  </span>
                </div>
                {item.subtitle && (
                  <p className="text-[11px] text-bodytext mt-0.5 leading-snug">
                    {item.subtitle}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-border/60 mt-4">
        <button
          type="button"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>View all activity</span>
          <Icon icon="solar:arrow-right-linear" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
