// src/components/EventsPage/EventsGrid.tsx
"use client";

import EventCard from "../EventCard/EventCard";
import { Event } from "../../data/eventsData";

interface EventsGridProps {
  events: Event[];
  onBookmark: (event: Event) => void;
}

export default function EventsGrid({ events, onBookmark }: EventsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {events.map((event, index) => (
        <div key={event.id} className="list-none relative group">
          <EventCard event={event} onBookmark={onBookmark} index={index} />
        </div>
      ))}
    </div>
  );
}
