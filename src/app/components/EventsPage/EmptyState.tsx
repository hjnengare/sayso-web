// src/components/EventsPage/EmptyState.tsx
"use client";

import { Calendar } from "react-feather";

interface EmptyStateProps {
  filterType: "all" | "event" | "special";
}

export default function EmptyState({ filterType }: EmptyStateProps) {
  const getEmptyMessage = () => {
    switch (filterType) {
      case "event":
        return {
          title: "No events found",
          description: "Check back later for new events!",
        };
      case "special":
        return {
          title: "No specials found",
          description: "Check back later for new specials!",
        };
      default:
        return {
          title: "No events or specials found",
          description: "Check back later for new events and specials!",
        };
    }
  };

  const { title, description } = getEmptyMessage();

  return (
    <div
      className="mx-auto w-full max-w-[2000px] px-2 font-urbanist w-full"
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <div className="text-center w-full">
        <div className="w-20 h-20 mx-auto mb-6 bg-sage/10 rounded-full flex items-center justify-center">
          <Calendar className="w-8 h-8 text-sage" />
        </div>
        <h3 
          className="text-h2 font-semibold text-charcoal mb-2"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
        >
          {title}
        </h3>
        <p 
          className="text-body-sm text-charcoal/60 mb-6 max-w-md mx-auto"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            fontWeight: 500,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
