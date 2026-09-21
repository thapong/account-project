import React from "react";
import { Icon } from "@iconify/react";

interface Product {
  id: string;
  name: string;
  category: string;
  assigned: {
    name: string;
    role: string;
    avatarBg: string;
    initials: string;
  };
  priority: "Low" | "Medium" | "High" | "Critical";
  budget: string;
}

const products: Product[] = [
  {
    id: "1",
    name: "MaterialM Tailwind Admin",
    category: "React / Next.js",
    assigned: {
      name: "Sunil Joshi",
      role: "Web Designer",
      avatarBg: "from-primary to-secondary",
      initials: "SJ",
    },
    priority: "Critical",
    budget: "฿84,500",
  },
  {
    id: "2",
    name: "Modernize Dashboard",
    category: "Full-Stack Project",
    assigned: {
      name: "Andrew McDownland",
      role: "Project Manager",
      avatarBg: "from-secondary to-success",
      initials: "AM",
    },
    priority: "Medium",
    budget: "฿56,200",
  },
  {
    id: "3",
    name: "Spike NextJS Template",
    category: "Frontend UI",
    assigned: {
      name: "Christopher Jamil",
      role: "Project Manager",
      avatarBg: "from-warning to-error",
      initials: "CJ",
    },
    priority: "High",
    budget: "฿32,900",
  },
  {
    id: "4",
    name: "Flexy Admin Angular",
    category: "Enterprise System",
    assigned: {
      name: "Nirav Joshi",
      role: "Frontend Engineer",
      avatarBg: "from-primary to-info",
      initials: "NJ",
    },
    priority: "Low",
    budget: "฿18,400",
  },
];

const priorityStyles = {
  Low: "bg-lightinfo text-info border-info/20",
  Medium: "bg-lightprimary text-primary border-primary/20",
  High: "bg-lightwarning text-warning border-warning/20",
  Critical: "bg-lighterror text-error border-error/20",
};

export default function ProductsTable() {
  return (
    <div className="bg-white rounded-2xl p-5 lg:p-6 border border-border/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-dark">Popular Products</h3>
          <p className="text-xs text-bodytext">Top selling items and project performance</p>
        </div>

        <button
          type="button"
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border text-dark hover:bg-lightgray transition-colors self-start sm:self-auto flex items-center gap-1.5"
        >
          <Icon icon="solar:filter-linear" className="size-4 text-bodytext" />
          <span>Filter</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/70 text-[11px] font-bold uppercase text-bodytext tracking-wider">
              <th className="pb-3 pr-4 font-semibold">Assigned</th>
              <th className="pb-3 px-4 font-semibold">Product</th>
              <th className="pb-3 px-4 font-semibold">Priority</th>
              <th className="pb-3 pl-4 font-semibold text-right">Budget</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 text-xs">
            {products.map((item) => (
              <tr key={item.id} className="hover:bg-lighthover/60 transition-colors">
                {/* Assigned */}
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-9 rounded-full bg-gradient-to-tr ${item.assigned.avatarBg} flex items-center justify-center text-white font-bold text-xs shadow-xs`}
                    >
                      {item.assigned.initials}
                    </div>
                    <div>
                      <h4 className="font-bold text-dark leading-tight">
                        {item.assigned.name}
                      </h4>
                      <p className="text-[11px] text-bodytext">
                        {item.assigned.role}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Product */}
                <td className="py-3.5 px-4">
                  <span className="font-semibold text-dark block">
                    {item.name}
                  </span>
                  <span className="text-[11px] text-bodytext">
                    {item.category}
                  </span>
                </td>

                {/* Priority */}
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                      priorityStyles[item.priority]
                    }`}
                  >
                    {item.priority}
                  </span>
                </td>

                {/* Budget */}
                <td className="py-3.5 pl-4 text-right font-bold text-dark">
                  {item.budget}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
