// src/components/EventDetail/EventInfo.tsx
"use client";

import { motion } from "framer-motion";
import { Star, MapPin } from "lucide-react";
import type { Event } from "../../lib/types/Event";

interface EventInfoProps {
  event: Event;
  sharedTitleLayoutId?: string;
}

export default function EventInfo({ event, sharedTitleLayoutId }: EventInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      <motion.h1
        layoutId={sharedTitleLayoutId}
        className="font-urbanist text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-3"
        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
      >
        {event.title}
      </motion.h1>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {event.type === "event" && !event.isExternalEvent && (
          <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 border ${event.businessId ? "bg-navbar-bg/10 text-navbar-bg border-navbar-bg/20" : "bg-coral/10 text-coral border-coral/20"}`}>
            <span
              className="text-body-sm font-semibold"
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 600,
              }}
            >
              {event.businessId ? "Business-linked event" : "Community-hosted event"}
            </span>
          </div>
        )}
        {event.rating != null && (
          <div className="inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border-none">
            <Star className="w-3.5 h-3.5 text-coral fill-coral" aria-hidden />
            <span
              className="text-body-sm font-semibold text-charcoal"
              style={{ 
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 600
              }}
            >
              {Number(event.rating).toFixed(1)}
            </span>
          </div>
        )}

        {(event.location || event.city || event.country) && (
          <div className="flex items-center gap-1.5 text-charcoal/70">
            <MapPin size={14} />
            <span
              className="text-body-sm font-medium"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              {[event.location, [event.city, event.country].filter(Boolean).join(", ")]
                .filter(Boolean)
                .join(" · ") || "Location TBD"}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
