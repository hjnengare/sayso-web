// src/components/EventDetail/EventDescription.tsx
"use client";

import { motion } from "framer-motion";
import { Event } from "../../data/eventsData";

interface EventDescriptionProps {
  event: Event;
}

export default function EventDescription({ event }: EventDescriptionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] ring-1 ring-white/30 shadow-md p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Gradient overlays matching user profile */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>
      
      <div className="relative z-10">
        <h2
          className="text-h3 font-semibold text-charcoal mb-3"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          About This Event
        </h2>
        <p
          className="text-body text-charcoal/70 leading-relaxed break-words"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
        {event.description || "Join us for an amazing experience! This event promises to be unforgettable with great company, beautiful surroundings, and memorable moments. Don't miss out on this special opportunity to connect with like-minded people and create lasting memories."}
      </p>
      </div>
    </motion.div>
  );
}
