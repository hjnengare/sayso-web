// src/components/EventsPage/FilterTabs.tsx
"use client";

import { m, useReducedMotion } from "framer-motion";

interface FilterTabsProps {
  selectedFilter: "all" | "event" | "special";
  onFilterChange: (filter: "all" | "event" | "special") => void;
}

export default function FilterTabs({
  selectedFilter,
  onFilterChange,
}: FilterTabsProps) {
  const prefersReducedMotion = useReducedMotion();
  const filterEase = [0.22, 1, 0.36, 1] as const;
  const tabs = [
    { key: "all" as const, label: "All" },
    { key: "event" as const, label: "Events" },
    { key: "special" as const, label: "Specials" },
  ];

  return (
    <div className="flex items-center overflow-x-auto whitespace-nowrap scrollbar-hide">
      {tabs.map((tab, index) => {
        const isActive = selectedFilter === tab.key;
        return (
          <m.div
            key={tab.key}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.25, ease: filterEase, delay: index * 0.04 }
            }
            className="inline-flex items-center shrink-0"
          >
            {index > 0 && (
              <span aria-hidden className="mx-2 text-charcoal/55">
                |
              </span>
            )}
            <m.button
              type="button"
              onClick={() => onFilterChange(tab.key)}
              aria-pressed={isActive}
              whileHover={prefersReducedMotion ? undefined : { y: -1 }}
              whileTap={prefersReducedMotion ? undefined : { y: 1 }}
              className={`font-urbanist text-body-sm sm:text-body transition-colors duration-200 ${
                isActive
                  ? "text-coral underline underline-offset-4 decoration-1 font-600"
                  : "text-charcoal/70 hover:text-coral font-500"
              }`}
            >
              {tab.label}
            </m.button>
          </m.div>
        );
      })}
    </div>
  );
}
