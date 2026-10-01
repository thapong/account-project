import React from "react";
import Link from "next/link";

export default function FullLogo() {
  return (
    <Link href="/" className="flex items-center gap-3 py-4 px-2 select-none group">
      <div className="size-9 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-md shadow-primary/25 group-hover:scale-105 transition-transform duration-200">
        <svg
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-xl tracking-tight text-dark flex items-center gap-1">
          Atom<span className="text-primary font-extrabold">Sales</span>
        </span>
        <span className="text-[10px] uppercase font-semibold text-bodytext tracking-widest -mt-1">
          Sales workspace
        </span>
      </div>
    </Link>
  );
}
