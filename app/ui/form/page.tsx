"use client";

import React, { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";

export default function FormPage() {
  const [switchOn, setSwitchOn] = useState(true);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-2xl p-5 border border-border/80">
          <h2 className="text-xl font-bold text-dark mb-1">Form Elements</h2>
          <p className="text-xs text-bodytext">
            Standard input controls, select boxes, checkboxes, radios, and switch toggles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Form Controls */}
          <div className="bg-white rounded-2xl p-6 border border-border/80 shadow-xs flex flex-col gap-4">
            <h3 className="text-base font-bold text-dark border-b border-border/60 pb-3">
              Standard Inputs
            </h3>

            <div>
              <label className="block text-xs font-bold text-dark mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Mathew Anderson"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-lightgray/60 border border-border focus:bg-white focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-dark placeholder:text-bodytext"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-dark mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="mathew@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-lightgray/60 border border-border focus:bg-white focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-dark placeholder:text-bodytext"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-dark mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-lightgray/60 border border-border focus:bg-white focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-dark placeholder:text-bodytext"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-dark mb-1.5">
                Department Select
              </label>
              <select className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-lightgray/60 border border-border focus:bg-white focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-dark cursor-pointer">
                <option>Engineering Team</option>
                <option>Design & Creative</option>
                <option>Product & Operations</option>
                <option>Sales & Marketing</option>
              </select>
            </div>
          </div>

          {/* Toggles, Checkbox & Radios */}
          <div className="bg-white rounded-2xl p-6 border border-border/80 shadow-xs flex flex-col gap-4">
            <h3 className="text-base font-bold text-dark border-b border-border/60 pb-3">
              Checkboxes & Switches
            </h3>

            {/* Checkboxes */}
            <div className="space-y-3">
              <span className="block text-xs font-bold text-dark">Options</span>
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-dark select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="size-4 rounded-md text-primary accent-primary border-border focus:ring-primary/20"
                />
                <span>Email notifications enabled</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-dark select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="size-4 rounded-md text-primary accent-primary border-border focus:ring-primary/20"
                />
                <span>Weekly digest summary</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-dark select-none">
                <input
                  type="checkbox"
                  className="size-4 rounded-md text-primary accent-primary border-border focus:ring-primary/20"
                />
                <span>Marketing & promotion emails</span>
              </label>
            </div>

            {/* Switches */}
            <div className="pt-2 border-t border-border/60">
              <span className="block text-xs font-bold text-dark mb-3">
                Switch Toggle
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-dark font-medium">
                  Dark mode auto-sync
                </span>
                <button
                  type="button"
                  onClick={() => setSwitchOn(!switchOn)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                    switchOn ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`bg-white size-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      switchOn ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="pt-4 mt-auto flex items-center gap-3">
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-emphasis transition-all cursor-pointer"
              >
                Submit Form
              </button>
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl border border-border text-bodytext hover:text-dark hover:bg-lightgray text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
