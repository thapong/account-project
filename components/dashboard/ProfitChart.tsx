"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";

interface MonthlyData {
  month: string;
  earnings: number;
  expenses: number;
}

const data: MonthlyData[] = [
  { month: "Jan", earnings: 45, expenses: 28 },
  { month: "Feb", earnings: 60, expenses: 35 },
  { month: "Mar", earnings: 52, expenses: 30 },
  { month: "Apr", earnings: 78, expenses: 48 },
  { month: "May", earnings: 65, expenses: 40 },
  { month: "Jun", earnings: 90, expenses: 55 },
  { month: "Jul", earnings: 82, expenses: 45 },
  { month: "Aug", earnings: 95, expenses: 62 },
  { month: "Sep", earnings: 70, expenses: 38 },
];

export default function ProfitChart() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState("2026");

  const maxVal = 100;
  const chartHeight = 200;

  return (
    <div className="bg-white rounded-2xl p-5 lg:p-6 border border-border/80 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-dark">Revenue Updates</h3>
          <p className="text-xs text-bodytext">Overview of monthly earnings vs expenses</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary" />
              <span className="text-dark">Earnings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-secondary" />
              <span className="text-dark">Expenses</span>
            </div>
          </div>

          {/* Select year */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs font-semibold bg-lightgray border border-border rounded-xl px-3 py-1.5 pr-8 text-dark focus:outline-hidden focus:border-primary cursor-pointer appearance-none"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
            <Icon
              icon="solar:alt-arrow-down-linear"
              className="size-3 text-bodytext absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Interactive Bar Chart Visualization */}
      <div className="relative pt-4">
        {/* Y Axis reference lines */}
        <div className="absolute inset-x-0 top-4 h-[200px] flex flex-col justify-between pointer-events-none border-b border-border/60">
          <div className="w-full border-b border-dashed border-border/60" />
          <div className="w-full border-b border-dashed border-border/60" />
          <div className="w-full border-b border-dashed border-border/60" />
          <div className="w-full" />
        </div>

        {/* Bars Container */}
        <div className="relative h-[200px] flex items-end justify-between gap-2 sm:gap-4 px-2">
          {data.map((item, idx) => {
            const earnHeight = (item.earnings / maxVal) * chartHeight;
            const expHeight = (item.expenses / maxVal) * chartHeight;
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={item.month}
                className="flex-1 flex flex-col items-center group relative h-full justify-end"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip Popup on Hover */}
                {isHovered && (
                  <div className="absolute -top-12 z-30 bg-dark text-white text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-lg whitespace-nowrap animate-dropdown">
                    <div>Earnings: ${item.earnings}k</div>
                    <div className="text-secondary">Expenses: ${item.expenses}k</div>
                  </div>
                )}

                {/* Bars Pair */}
                <div className="flex items-end gap-1 sm:gap-1.5 w-full justify-center">
                  {/* Earnings Bar */}
                  <div
                    style={{ height: `${earnHeight}px` }}
                    className="w-2.5 sm:w-3.5 bg-primary rounded-t-md transition-all duration-300 group-hover:brightness-110 group-hover:scale-y-102 origin-bottom"
                  />
                  {/* Expenses Bar */}
                  <div
                    style={{ height: `${expHeight}px` }}
                    className="w-2.5 sm:w-3.5 bg-secondary rounded-t-md transition-all duration-300 group-hover:brightness-110 group-hover:scale-y-102 origin-bottom"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* X Axis Month Labels */}
        <div className="flex justify-between px-2 pt-3 text-[11px] font-semibold text-bodytext">
          {data.map((item) => (
            <span key={item.month} className="flex-1 text-center">
              {item.month}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
