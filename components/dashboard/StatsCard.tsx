import React from "react";
import { Icon } from "@iconify/react";

interface StatsCardProps {
  title: string;
  amount: string;
  change: string;
  isPositive: boolean;
  icon: string;
  color: "primary" | "secondary" | "success" | "warning" | "error";
}

const colorMap = {
  primary: {
    bg: "bg-lightprimary",
    text: "text-primary",
    badgeBg: "bg-primary/10",
  },
  secondary: {
    bg: "bg-lightsecondary",
    text: "text-secondary",
    badgeBg: "bg-secondary/10",
  },
  success: {
    bg: "bg-lightsuccess",
    text: "text-success",
    badgeBg: "bg-success/10",
  },
  warning: {
    bg: "bg-lightwarning",
    text: "text-warning",
    badgeBg: "bg-warning/10",
  },
  error: {
    bg: "bg-lighterror",
    text: "text-error",
    badgeBg: "bg-error/10",
  },
};

export default function StatsCard({
  title,
  amount,
  change,
  isPositive,
  icon,
  color,
}: StatsCardProps) {
  const styles = colorMap[color];

  return (
    <div className="bg-white rounded-2xl p-5 border border-border/80 shadow-xs hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`size-12 rounded-2xl ${styles.bg} ${styles.text} flex items-center justify-center`}>
          <Icon icon={icon} className="size-6" />
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            isPositive
              ? "bg-lightsuccess text-success"
              : "bg-lighterror text-error"
          }`}
        >
          <Icon
            icon={isPositive ? "solar:arrow-right-up-linear" : "solar:arrow-right-down-linear"}
            className="size-3.5"
          />
          <span>{change}</span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-bodytext uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-dark">{amount}</h3>
      </div>
    </div>
  );
}
