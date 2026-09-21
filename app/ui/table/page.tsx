import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import ProductsTable from "@/components/dashboard/ProductsTable";
import { Icon } from "@iconify/react";

export default function TablePage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-2xl p-5 border border-border/80">
          <h2 className="text-xl font-bold text-dark mb-1">Tables</h2>
          <p className="text-xs text-bodytext">
            Explore MaterialM clean tables with badge priority, responsive viewports and interactive rows.
          </p>
        </div>

        {/* Standard Table Component */}
        <ProductsTable />

        {/* Striped Table Example */}
        <div className="bg-white rounded-2xl p-5 lg:p-6 border border-border/80 shadow-xs">
          <h3 className="text-base font-bold text-dark mb-1">Striped Table</h3>
          <p className="text-xs text-bodytext mb-4">Alternating rows with subtle contrast</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-bodytext font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "John Doe", email: "john@example.com", role: "Developer", plan: "Enterprise", status: "Active" },
                  { name: "Emma Watson", email: "emma@example.com", role: "Designer", plan: "Pro", status: "Active" },
                  { name: "Robert Fox", email: "robert@example.com", role: "Manager", plan: "Basic", status: "Pending" },
                  { name: "Sarah Connor", email: "sarah@example.com", role: "DevOps", plan: "Enterprise", status: "Inactive" },
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? "bg-lightgray/50" : "bg-white"}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-dark">{row.name}</div>
                      <div className="text-[11px] text-bodytext">{row.email}</div>
                    </td>
                    <td className="py-3 px-4 text-bodytext font-medium">{row.role}</td>
                    <td className="py-3 px-4 font-semibold text-dark">{row.plan}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.status === "Active"
                            ? "bg-lightsuccess text-success"
                            : row.status === "Pending"
                            ? "bg-lightwarning text-warning"
                            : "bg-lighterror text-error"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        className="p-1 rounded-lg text-bodytext hover:text-primary hover:bg-lightprimary transition-colors"
                      >
                        <Icon icon="solar:pen-new-square-linear" className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
