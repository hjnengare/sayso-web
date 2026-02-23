// src/components/EventDetail/EventContactInfo.tsx
"use client";

import { m } from "framer-motion";
import { Phone, Globe, MapPin } from "lucide-react";
import type { Event } from "../../lib/types/Event";

interface EventContactInfoProps {
  event: Event;
}

export default function EventContactInfo({ event }: EventContactInfoProps) {
  const websiteUrl = event.url || event.purchaseUrl || event.bookingUrl || (event as any).ticketmaster_url || "";
  const contactText = event.bookingContact || "";
  const primaryLocation = event.venueAddress || event.location || "";
  const secondaryLocation = [event.city, event.country].filter(Boolean).join(", ");
  const hasAnyInfo = !!(contactText || websiteUrl || primaryLocation || secondaryLocation);

  return (
    <m.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px]  shadow-md p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Gradient overlays matching user profile */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>
      
      <div className="relative z-10">
        <h3
          className="text-h3 font-semibold text-charcoal mb-3"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Contact Information
        </h3>

        {hasAnyInfo ? (
          <div className="space-y-2.5">
            {contactText && (
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                  <Phone className="w-4 h-4 text-charcoal/85" />
                </span>
                <span
                  className="text-body-sm text-charcoal/70"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  {contactText}
                </span>
              </div>
            )}

            {websiteUrl && (
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                  <Globe className="w-4 h-4 text-charcoal/85" />
                </span>
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-body-sm text-navbar-bg font-600 underline underline-offset-4"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  Visit booking page
                </a>
              </div>
            )}

            {(primaryLocation || secondaryLocation) && (
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                  <MapPin className="w-4 h-4 text-charcoal/85" />
                </span>
                <span
                  className="text-body-sm text-charcoal/70"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  {primaryLocation}
                  {primaryLocation && secondaryLocation ? ", " : ""}
                  {secondaryLocation}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p
            className="text-body-sm text-charcoal/70"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            Contact details are not available for this event yet.
          </p>
        )}
      </div>
    </m.div>
  );
}
