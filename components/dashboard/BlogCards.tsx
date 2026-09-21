import React from "react";
import { Icon } from "@iconify/react";

interface CardItem {
  id: string;
  title: string;
  category: string;
  views: string;
  comments: string;
  date: string;
  imageGradient: string;
  icon: string;
}

const cards: CardItem[] = [
  {
    id: "1",
    title: "Gearing up for the Next.js 16 and React 19 Ecosystem",
    category: "Development",
    views: "9,125",
    comments: "3",
    date: "Mon, Dec 23",
    imageGradient: "from-blue-600 to-indigo-900",
    icon: "solar:code-square-bold",
  },
  {
    id: "2",
    title: "How to Build Modern Responsive Dashboards with Tailwind CSS",
    category: "Design",
    views: "4,230",
    comments: "12",
    date: "Sun, Dec 22",
    imageGradient: "from-teal-500 to-emerald-800",
    icon: "solar:pallete-2-bold",
  },
  {
    id: "3",
    title: "Best Practices for State Management and Micro-Animations",
    category: "Productivity",
    views: "6,890",
    comments: "8",
    date: "Sat, Dec 21",
    imageGradient: "from-purple-600 to-pink-800",
    icon: "solar:magic-stick-3-bold",
  },
];

export default function BlogCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-white rounded-2xl overflow-hidden border border-border/80 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col group"
        >
          {/* Cover Header */}
          <div
            className={`h-40 bg-gradient-to-tr ${card.imageGradient} p-5 flex flex-col justify-between relative overflow-hidden`}
          >
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
                {card.category}
              </span>
              <button
                type="button"
                className="size-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <Icon icon="solar:bookmark-linear" className="size-4" />
              </button>
            </div>

            <div className="relative z-10 flex items-center gap-2 text-white/90">
              <Icon icon={card.icon} className="size-8 text-white group-hover:scale-110 transition-transform duration-300" />
            </div>

            {/* Decorative background circle */}
            <div className="absolute -right-8 -bottom-8 size-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          </div>

          {/* Body Content */}
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-dark text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                {card.title}
              </h4>
              <p className="text-xs text-bodytext line-clamp-2">
                Learn actionable tips and architecture patterns to enhance UI performance and responsive slide interactions.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-4 text-[11px] text-bodytext font-medium">
              <span className="flex items-center gap-1">
                <Icon icon="solar:clock-circle-linear" className="size-3.5" />
                <span>{card.date}</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Icon icon="solar:eye-linear" className="size-3.5" />
                  <span>{card.views}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Icon icon="solar:chat-round-linear" className="size-3.5" />
                  <span>{card.comments}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
