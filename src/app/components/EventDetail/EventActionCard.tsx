// src/components/EventDetail/EventActionCard.tsx
"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Calendar, Share2, Bell, Users, Check, X } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import type { Event } from "../../lib/types/Event";
import { resolveCtaTarget } from "../../lib/events/cta";
import { downloadICS } from "../../lib/events/generateICS";
import { useEventRsvp } from "../../hooks/useEventRsvp";
import { useEventReminder, type RemindBefore } from "../../hooks/useEventReminder";

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
  const { user } = useAuth();
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const { count: rsvpCount, isGoing, toggle: toggleRsvp } = useEventRsvp(eventId ?? '');
  const { hasReminder, toggle: toggleReminder, loading: reminderLoading } = useEventReminder(
    eventId ?? '',
    eventData?.title ?? '',
    eventData?.startDateISO
  );

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
    }).catch(() => {});
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
        logCtaClick({ ctaKind: resolved.ctaKind, ctaSource: resolved.ctaSource, targetUrl: resolved.url });
        return;
      }
    }
    if (fallbackUrl) {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      logCtaClick({ ctaKind: "external_url", ctaSource: eventData?.ctaSource ?? null, targetUrl: fallbackUrl });
      return;
    }
    if (bookingContact) { showToast?.(bookingContact, "info"); return; }
    showToast?.("Booking link not available yet.", "info");
  };

  const handleCalendar = () => {
    if (!eventData) return;
    downloadICS({
      id: eventData.id,
      title: eventData.title,
      startDateISO: eventData.startDateISO,
      endDateISO: eventData.endDateISO,
      location: eventData.location,
      description: eventData.description,
      url: eventData.bookingUrl || eventData.url,
    });
    showToast?.("Calendar event downloaded!", "success", 2000);
  };

  const handleShare = async () => {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${eventData?.href ?? `/event/${eventId}`}`;
    const shareText = `Check out ${eventData?.title ?? "this event"} on sayso!`;
    try {
      if (navigator.share && navigator.canShare?.({ title: eventData?.title, text: shareText, url: shareUrl })) {
        await navigator.share({ title: eventData?.title, text: shareText, url: shareUrl });
        showToast?.("Shared successfully!", "success", 2000);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast?.("Link copied to clipboard!", "success", 2000);
      }
    } catch {
      showToast?.("Failed to share.", "info", 3000);
    }
  };

  const handleReminderOption = async (option: RemindBefore) => {
    if (!user) {
      showToast?.("Sign in to set reminders", "info", 3000);
      setShowReminderPicker(false);
      return;
    }
    if (!eventData?.startDateISO) {
      showToast?.("Event date unavailable", "info", 2000);
      setShowReminderPicker(false);
      return;
    }
    try {
      const isNowActive = await toggleReminder(option);
      const label = option === '1_day' ? '1 day before' : '2 hours before';
      showToast?.(
        isNowActive ? `Reminder set for ${label}` : `Reminder removed`,
        "success",
        2500
      );
    } catch (e: any) {
      showToast?.(e?.message ?? "Could not set reminder", "info", 3000);
    }
    setShowReminderPicker(false);
  };

  const fontStyle = { fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' };

  return (
    <m.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg" />

      <div className="relative z-10">
        <h3 className="text-h3 font-semibold text-charcoal mb-3" style={fontStyle}>
          Join This Event
        </h3>

        <div className="space-y-3">
          {/* Primary CTA */}
          <m.button
            type="button"
            onClick={handleReserveClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white font-semibold py-3 px-5 rounded-full transition-all duration-300 hover:bg-navbar-bg border border-white/30 shadow-md text-body-sm"
            style={fontStyle}
          >
            {!isLikelyPhone(bookingContact) && bookingContact?.trim() ? bookingContact.trim() : "Reserve Your Spot"}
          </m.button>

          {/* Engagement row: Going · Remind · Calendar · Share */}
          <div className="grid grid-cols-4 gap-2">
            {/* Going */}
            <m.button
              type="button"
              onClick={() => eventId && toggleRsvp()}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-200 text-center ${
                isGoing
                  ? "bg-sage/15 text-sage"
                  : "bg-charcoal/5 text-charcoal/60 hover:bg-charcoal/10 hover:text-charcoal/80"
              }`}
              aria-label={isGoing ? "Remove Going" : "Mark as Going"}
            >
              <Users className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
              <span className="text-[10px] font-semibold leading-none" style={fontStyle}>
                {rsvpCount > 0 ? rsvpCount : "Going"}
              </span>
            </m.button>

            {/* Remind */}
            <div className="relative">
              <m.button
                type="button"
                onClick={() => setShowReminderPicker((p) => !p)}
                whileTap={{ scale: 0.95 }}
                className={`w-full flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-200 ${
                  hasReminder('1_day') || hasReminder('2_hours')
                    ? "bg-sage/15 text-sage"
                    : "bg-charcoal/5 text-charcoal/60 hover:bg-charcoal/10 hover:text-charcoal/80"
                }`}
                aria-label="Set reminder"
              >
                <Bell className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                <span className="text-[10px] font-semibold leading-none" style={fontStyle}>Remind</span>
              </m.button>

              {/* Reminder picker dropdown */}
              <AnimatePresence>
                {showReminderPicker && (
                  <m.div
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-white rounded-xl shadow-xl border border-charcoal/8 p-2 min-w-[160px]"
                  >
                    <button
                      type="button"
                      onClick={() => handleReminderOption('1_day')}
                      disabled={reminderLoading}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                        hasReminder('1_day') ? 'bg-sage/10 text-sage font-semibold' : 'hover:bg-charcoal/5 text-charcoal/80'
                      }`}
                      style={fontStyle}
                    >
                      1 day before
                      {hasReminder('1_day') && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReminderOption('2_hours')}
                      disabled={reminderLoading}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                        hasReminder('2_hours') ? 'bg-sage/10 text-sage font-semibold' : 'hover:bg-charcoal/5 text-charcoal/80'
                      }`}
                      style={fontStyle}
                    >
                      2 hours before
                      {hasReminder('2_hours') && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReminderPicker(false)}
                      className="w-full flex items-center justify-center mt-1 px-3 py-1.5 rounded-lg text-xs text-charcoal/40 hover:text-charcoal/60 transition-colors"
                      style={fontStyle}
                    >
                      <X className="w-3 h-3 mr-1" /> Close
                    </button>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            {/* Calendar */}
            <m.button
              type="button"
              onClick={handleCalendar}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl bg-charcoal/5 text-charcoal/60 hover:bg-charcoal/10 hover:text-charcoal/80 transition-all duration-200"
              aria-label="Add to calendar"
            >
              <Calendar className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
              <span className="text-[10px] font-semibold leading-none" style={fontStyle}>Calendar</span>
            </m.button>

            {/* Share */}
            <m.button
              type="button"
              onClick={handleShare}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl bg-charcoal/5 text-charcoal/60 hover:bg-charcoal/10 hover:text-charcoal/80 transition-all duration-200"
              aria-label="Share event"
            >
              <Share2 className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
              <span className="text-[10px] font-semibold leading-none" style={fontStyle}>Share</span>
            </m.button>
          </div>

          {/* Write Review */}
          {eventId && (
            <m.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={`/write-review/event/${eventId}`}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-coral to-coral/90 text-white font-semibold py-3 px-5 rounded-full transition-all duration-300 hover:scale-105 border border-white/30 shadow-md text-body-sm"
                style={fontStyle}
              >
                Write Review
              </Link>
            </m.div>
          )}
        </div>
      </div>
    </m.div>
  );
}
