// src/components/EventDetail/EventInfo.tsx
"use client";

import { m } from "framer-motion";
import { MapPin } from "lucide-react";
import GoldStar from "../Icons/GoldStar";
import type { Event } from "../../lib/types/Event";

interface EventInfoProps {
  event: Event;
  sharedTitleLayoutId?: string;
}

export default function EventInfo({ event, sharedTitleLayoutId }: EventInfoProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      <m.h1
        layoutId={sharedTitleLayoutId}
        className="font-urbanist text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-3"
        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
      >
        {event.title}
      </m.h1>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {event.rating != null && (
          <div className="inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border-none">
            <GoldStar size={14} className="w-3.5 h-3.5" />
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
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
              <MapPin className="w-4 h-4 text-charcoal/85" />
            </span>
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
    </m.div>
  );
}
