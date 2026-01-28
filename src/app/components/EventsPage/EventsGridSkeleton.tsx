// src/components/EventsPage/EventsGridSkeleton.tsx
"use client";

import EventCardSkeleton from "../EventCard/EventCardSkeleton";

interface EventsGridSkeletonProps {
  count?: number;
}

export default function EventsGridSkeleton({ count = 12 }: EventsGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3 md:gap-3 lg:gap-2 xl:gap-2 2xl:gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="list-none relative">
          <EventCardSkeleton />
        </div>
      ))}
    </div>
  );
}

