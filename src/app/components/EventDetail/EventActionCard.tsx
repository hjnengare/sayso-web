// src/components/EventDetail/EventActionCard.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useToast } from "../../contexts/ToastContext";
import type { Event } from "../../lib/types/Event";
import { resolveCtaTarget } from "../../lib/events/cta";

interface EventActionCardProps {
  eventId?: string;
  hasReviewed?: boolean;
  bookingUrl?: string;
  ticketmasterUrl?: string;
  bookingContact?: string;
  purchaseUrl?: string;
  eventData?: Event;
}

export default function EventActionCard({
  eventId,
  hasReviewed = false,
  bookingUrl,
  ticketmasterUrl,
  bookingContact,
  purchaseUrl,
  eventData,
}: EventActionCardProps) {
  const { showToast } = useToast();

  const isLikelyPhone = (value?: string) => {
    if (!value) return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    const digits = trimmed.replace(/[^\d]/g, "");
    return digits.length >= 7 && /^[\d+()\-\s]+$/.test(trimmed);
  };

  const logCtaClick = (payload: { ctaKind: "external_url" | "whatsapp"; ctaSource?: string | null; targetUrl: string }) => {
    if (!eventId) return;
    void fetch(`/api/events-and-specials/${eventId}/cta-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify(payload),
    }).catch(() => {
      // Never block CTA navigation for analytics failures.
    });
  };

  const handleReserveClick = () => {
    const cleanUrl = (value?: string) => value?.trim() || "";
    const fallbackUrl = cleanUrl(ticketmasterUrl) || cleanUrl(bookingUrl) || cleanUrl(purchaseUrl);

    if (eventData && typeof window !== "undefined") {
      const resolved = resolveCtaTarget({
        event: eventData,
        currentUrl: window.location.href,
        ctaSource: eventData.ctaSource ?? null,
        bookingUrl: cleanUrl(eventData.bookingUrl) || fallbackUrl,
        whatsappNumber: eventData.whatsappNumber ?? null,
        whatsappPrefillTemplate: eventData.whatsappPrefillTemplate ?? null,
      });

      if (resolved.url) {
        window.open(resolved.url, "_blank", "noopener,noreferrer");
        logCtaClick({
          ctaKind: resolved.ctaKind,
          ctaSource: resolved.ctaSource,
          targetUrl: resolved.url,
        });
        return;
      }
    }

    if (fallbackUrl) {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      logCtaClick({ ctaKind: "external_url", ctaSource: eventData?.ctaSource ?? null, targetUrl: fallbackUrl });
      return;
    }

    if (bookingContact) {
      showToast?.(bookingContact, "info");
      return;
    }

    showToast?.("Booking link not available yet.", "info");
  };
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] ring-1 ring-white/30 shadow-md p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Gradient overlays matching user profile */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>
      
      <div className="relative z-10">
        <h3
          className="text-h3 font-semibold text-charcoal mb-3"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Join This Event
        </h3>

        <div className="space-y-3">
          <motion.button
            type="button"
            onClick={handleReserveClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white font-semibold py-3 px-5 rounded-full transition-all duration-300 hover:bg-navbar-bg border border-white/30 shadow-md text-body-sm"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {!isLikelyPhone(bookingContact) && bookingContact?.trim() ? bookingContact.trim() : "Reserve Your Spot"}
          </motion.button>

          {eventId && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={`/write-review/event/${eventId}`}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-coral to-coral/90 text-white font-semibold py-3 px-5 rounded-full transition-all duration-300 hover:scale-105 border border-white/30 shadow-md text-body-sm"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Write Review
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
