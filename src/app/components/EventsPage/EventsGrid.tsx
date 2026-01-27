// src/components/EventsPage/EventsGrid.tsx
"use client";

import { motion } from "framer-motion";
import EventCard from "../EventCard/EventCard";
import type { Event } from "../../lib/types/Event";

interface EventsGridProps {
  events: Event[];
  disableMotion?: boolean;
  cardWrapperClass?: string;
  cardOverlayClass?: string;
}

export default function EventsGrid({ events, disableMotion = false, cardWrapperClass, cardOverlayClass }: EventsGridProps) {
  if (disableMotion) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-5 lg:gap-6">
        {events.map((event, index) => (
          <div key={event.id} className={`list-none relative ${cardWrapperClass ?? ""}`}>
            {cardOverlayClass && <span aria-hidden className={cardOverlayClass} />}
            <EventCard event={event} index={index} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-5 lg:gap-6"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.06,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {events.map((event, index) => (
        <motion.div
          key={event.id}
          className="list-none relative group"
          variants={{
            hidden: {
              opacity: 0,
              y: 30,
              scale: 0.95,
            },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                type: "spring",
                damping: 25,
                stiffness: 200,
              },
            },
          }}
        >
          <EventCard event={event} index={index} />
        </motion.div>
      ))}
    </motion.div>
  );
}
