// src/components/EventsPage/FilterTabs.tsx
"use client";

interface FilterTabsProps {
  selectedFilter: "all" | "event" | "special";
  onFilterChange: (filter: "all" | "event" | "special") => void;
}

export default function FilterTabs({
  selectedFilter,
  onFilterChange,
}: FilterTabsProps) {
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
          <div key={tab.key} className="inline-flex items-center shrink-0">
            {index > 0 && (
              <span aria-hidden className="mx-2 text-charcoal/55">
                |
              </span>
            )}
            <button
              type="button"
              onClick={() => onFilterChange(tab.key)}
              aria-pressed={isActive}
              className={`font-urbanist text-body-sm sm:text-body transition-colors duration-200 ${
                isActive
                  ? "text-coral underline underline-offset-4 decoration-1 font-600"
                  : "text-charcoal/70 hover:text-coral font-500"
              }`}
            >
              {tab.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
