"use client";

import { use } from "react";
import { useEventDetail } from "../../hooks/useEventDetail";
import { useSavedEvent } from "../../hooks/useSavedEvent";
import { m, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import {
  ChevronRight,
  Calendar,
  MapPin,
  Star,
  Clock,
  Users,
  Heart,
  Phone,
  Globe,
  Percent,
} from "lucide-react";
import type { Event } from "../../lib/types/Event";
import { useToast } from "../../contexts/ToastContext";
import { PageLoader } from "../../components/Loader";
import { normalizeDescriptionText } from "../../lib/utils/descriptionText";
import { resolveCtaTarget } from "../../lib/events/cta";
// Extended type for special with business info
interface SpecialWithBusiness extends Event {
  businessSlug?: string;
  businessLogo?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessWebsite?: string;
  businessEmail?: string;
  isExpired?: boolean;
}

interface SpecialDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SpecialDetailPage({ params }: SpecialDetailPageProps) {
  const { showToast } = useToast();
  const { user } = useAuth();

  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params);

  // SWR-backed data fetching
  const {
    event: rawEvent,
    occurrencesList,
    occurrencesCount,
    isExpired,
    loading,
    error,
  } = useEventDetail(resolvedParams.id);

  const special = rawEvent as SpecialWithBusiness | null;

  const { isSaved: isLiked, toggle: toggleSaved } = useSavedEvent(special?.id ?? null);

  const normalizedDescription =
    normalizeDescriptionText(special?.description) ||
    "Don't miss out on this amazing special offer! This limited-time deal provides incredible value and a fantastic experience. Perfect for trying something new or treating yourself to something special.";

  const handleLike = async () => {
    if (!special) return;
    if (!user) {
      showToast("Log in to save specials", "sage");
      return;
    }
    await toggleSaved();
    showToast(isLiked ? "Removed from favourites" : "Saved to favourites", "sage", 2000);
  };

  const isLikelyPhone = (value?: string | null) => {
    if (!value) return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    const digits = trimmed.replace(/[^\d]/g, "");
    return digits.length >= 7 && /^[\d+()\-\s]+$/.test(trimmed);
  };

  const logCtaClick = (payload: { ctaKind: "external_url" | "whatsapp"; ctaSource?: string | null; targetUrl: string }) => {
    if (!special?.id) return;
    void fetch(`/api/events-and-specials/${special.id}/cta-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify(payload),
    }).catch(() => {
      // Intentionally ignore tracking failures.
    });
  };

  const handlePrimaryCtaClick = () => {
    if (!special || typeof window === "undefined") return;

    const resolved = resolveCtaTarget({
      event: special,
      currentUrl: window.location.href,
      ctaSource: special.ctaSource ?? null,
      bookingUrl: special.bookingUrl ?? null,
      whatsappNumber: special.whatsappNumber ?? null,
      whatsappPrefillTemplate: special.whatsappPrefillTemplate ?? null,
    });

    let targetUrl = resolved.url;
    let ctaKind: "external_url" | "whatsapp" = resolved.ctaKind;
    let ctaSource = resolved.ctaSource;

    if (!targetUrl && special.businessWebsite) {
      targetUrl = special.businessWebsite.startsWith("http") ? special.businessWebsite : `https://${special.businessWebsite}`;
      ctaKind = "external_url";
      ctaSource = ctaSource ?? "website";
    }

    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      logCtaClick({ ctaKind, ctaSource, targetUrl });
      return;
    }

    showToast("Booking link not available yet.", "info");
  };

  const phoneContact = isLikelyPhone(special?.bookingContact) ? special?.bookingContact : special?.businessPhone;
  const primaryCtaLabel = (() => {
    if (special?.bookingContact && !isLikelyPhone(special.bookingContact)) {
      return special.bookingContact.trim();
    }
    if ((special?.ctaSource ?? "").toLowerCase() === "whatsapp" || special?.whatsappNumber) {
      return "WhatsApp Booking";
    }
    if (special?.bookingUrl) {
      return "Book Now";
    }
    if (special?.businessWebsite) {
      return "Visit Website";
    }
    return "Visit Venue";
  })();

  if (loading) {
    return (
      <div className="min-h-dvh bg-off-white">
        <AnimatePresence>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-off-white min-h-[100dvh] w-full flex items-center justify-center"
          >
            <PageLoader size="lg" variant="wavy" color="sage" />
          </m.div>
        </AnimatePresence>
      </div>
    );
  }

  if (error || !special || isExpired) {
    const isExpiredError = isExpired;
    return (
      <div className="min-h-[100dvh] bg-off-white flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-none">
            <Calendar className="w-7 h-7 text-charcoal" />
          </div>
          <h1
            className="text-2xl font-bold text-charcoal mb-4"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          >
            {isExpiredError ? 'Special Expired' : 'Special Not Found'}
          </h1>
          <p
            className="text-charcoal/70 mb-6"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          >
            {isExpiredError
              ? 'This special offer is no longer available.'
              : 'The special you\'re looking for doesn\'t exist.'}
          </p>
          <Link
            href="/events-specials"
            className="px-6 py-2.5 bg-gradient-to-br from-charcoal to-charcoal/90 text-white rounded-full text-sm font-600 hover:bg-charcoal/90 transition-all duration-300 border border-white/30 inline-block"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          >
            Back to Events & Specials
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-[100dvh] bg-off-white font-urbanist"
        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
      >
        <div className="min-h-[100dvh] bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white relative overflow-hidden min-h-[100dvh]">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />

          <section className="relative min-h-[100dvh]" style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
            <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10 pt-20 sm:pt-24 py-4 sm:py-6 md:py-8 pb-12 sm:pb-16">
          {/* Breadcrumb Navigation */}
          <nav className="pb-1" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm sm:text-base">
              <li>
                <Link href="/events-specials" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  Events & Specials
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-4 h-4 text-charcoal/60" />
              </li>
              <li>
                <span className="text-charcoal font-semibold truncate max-w-[200px] sm:max-w-none" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  {special?.title || 'Special'}
                </span>
              </li>
            </ol>
          </nav>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
              {/* Hero Image */}
              <m.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] rounded-none overflow-hidden border-none"
              >
                <Image
                  src={special.image || "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1920&h=1080&fit=crop&crop=center&q=90"}
                  alt={special.alt || special.title}
                  fill
                  className="object-cover"
                  priority
                  quality={80}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 1080px"
                  style={{ objectFit: 'cover' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                
                {/* Special Badge */}
                <div className="absolute top-6 left-6">
                  <span className="px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-md border bg-card-bg/90 text-white border-sage/50">
                    Special Offer
                  </span>
                </div>

                {/* Like Button */}
                <button
                  onClick={handleLike}
                  className={`absolute top-6 right-6 w-12 h-12 rounded-full backdrop-blur-md border transition-all duration-300 hover:scale-110 ${
                    isLiked
                      ? "bg-coral/90 text-white border-coral/50"
                      : "bg-white/20 text-white border-white/30 hover:bg-white/30"
                  }`}
                  aria-label="Like special"
                >
                  <Heart className={`mx-auto ${isLiked ? "fill-current" : ""}`} size={20} />
                </button>
              </m.div>

              {/* Special Title */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <h1
                  className="font-urbanist text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal mb-4"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  {special.title}
                </h1>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1">
                    <Star className="text-amber-400 fill-amber-400" size={16} />
                    <span className="text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{special.rating}</span>
                  </div>
                  <div className="flex items-center gap-2 text-charcoal/70">
                    <MapPin size={14} />
                    <span className="text-xs font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{special.location}</span>
                  </div>
                </div>
              </m.div>

              {/* Special Details */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6"
              >
                <h2 className="text-h3 font-semibold text-charcoal mb-4" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Special Details</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-coral/10 rounded-full flex items-center justify-center">
                      <Calendar className="text-coral" size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Valid From</p>
                      <p className="text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{special.startDate}</p>
                    </div>
                  </div>

                  {special.endDate && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 bg-coral/10 rounded-full flex items-center justify-center">
                        <Calendar className="text-coral" size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Valid Until</p>
                        <p className="text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{special.endDate}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-card-bg/10 rounded-full flex items-center justify-center">
                      <Percent className="text-sage" size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Price</p>
                      <p className="text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{special.price || "Special Price"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-coral/10 rounded-full flex items-center justify-center">
                      <Clock className="text-coral" size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Available</p>
                      <p className="text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Limited Time</p>
                    </div>
                  </div>

                  {special.businessName && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 bg-card-bg/10 rounded-full flex items-center justify-center">
                        <Users className="text-sage" size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-charcoal/60" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Offered By</p>
                        <p className="text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>{special.businessName}</p>
                      </div>
                    </div>
                  )}
                </div>
              </m.div>

              {/* Description */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6"
              >
                <h2 className="text-h3 font-semibold text-charcoal mb-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>About This Special</h2>
                <p className="text-sm text-charcoal/80 leading-7 whitespace-pre-wrap break-words [overflow-wrap:anywhere]" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  {normalizedDescription}
                </p>
              </m.div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Action Card */}
              <m.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6"
              >
                <h3 className="text-h3 font-semibold text-charcoal mb-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>Claim This Special</h3>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handlePrimaryCtaClick}
                    className="w-full bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white font-semibold py-3 px-5 rounded-full transition-all duration-300 hover:bg-navbar-bg border border-white/30 shadow-md text-body-sm"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    {primaryCtaLabel}
                  </button>

                  {phoneContact ? (
                    <a
                      href={`tel:${phoneContact}`}
                      className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-coral to-coral/90 text-white font-semibold py-3 px-5 rounded-full transition-all duration-300 border border-white/30 shadow-md text-body-sm"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                      Call for Details
                    </a>
                  ) : (
                    <button className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-coral to-coral/90 text-white font-semibold py-3 px-5 rounded-full transition-all duration-300 border border-white/30 shadow-md text-body-sm" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                      Call for Details
                    </button>
                  )}
                </div>

              </m.div>

              {/* More dates */}
              {(() => {
                if (occurrencesCount <= 1 || occurrencesList.length <= 1 || !special) return null;

                // Compute the current special's date label to exclude from "More dates"
                const currentStart = new Date(special.startDateISO || special.startDate);
                const currentEnd = special.endDateISO || special.endDate ? new Date(special.endDateISO || special.endDate!) : null;
                const currentSameDay =
                  currentEnd &&
                  currentStart.getFullYear() === currentEnd.getFullYear() &&
                  currentStart.getMonth() === currentEnd.getMonth() &&
                  currentStart.getDate() === currentEnd.getDate();
                const currentStartLabel = Number.isFinite(currentStart.getTime())
                  ? currentStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : special.startDate;
                const currentEndLabel =
                  currentEnd && Number.isFinite(currentEnd.getTime())
                    ? currentEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : undefined;
                const currentDateLabel = currentEnd && !currentSameDay && currentEndLabel
                  ? `${currentStartLabel}–${currentEndLabel}`
                  : currentStartLabel;

                const otherDates = occurrencesList
                  .reduce<Array<{ id: string; label: string }>>((unique, o) => {
                    const start = new Date(o.start_date);
                    const end = o.end_date ? new Date(o.end_date) : null;
                    const sameDay =
                      end &&
                      start.getFullYear() === end.getFullYear() &&
                      start.getMonth() === end.getMonth() &&
                      start.getDate() === end.getDate();

                    const startLabel = Number.isFinite(start.getTime())
                      ? start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : o.start_date;
                    const endLabel =
                      end && Number.isFinite(end.getTime())
                        ? end.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : o.end_date;
                    const label = end && !sameDay && endLabel ? `${startLabel}–${endLabel}` : startLabel;

                    if (label !== currentDateLabel && !unique.some((u) => u.label === label)) {
                      unique.push({ id: o.id, label });
                    }
                    return unique;
                  }, []);

                if (otherDates.length === 0) return null;

                return (
                  <m.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55, duration: 0.6 }}
                    className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6"
                  >
                    <h3
                      className="text-h3 font-semibold text-charcoal mb-3"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                      More dates
                    </h3>
                    <div className="space-y-2">
                      {otherDates.map((o) => (
                        <div key={o.id} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-charcoal/80" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                            {o.label}
                          </span>
                          <Link
                            href={`/special/${o.id}`}
                            className="text-sm font-semibold text-coral hover:underline"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                          >
                            View
                          </Link>
                        </div>
                      ))}
                    </div>
                  </m.div>
                );
              })()}

              {/* Contact Info */}
              <m.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6"
              >
                <h3 className="text-h3 font-semibold text-charcoal mb-3" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                  {special.businessName || 'Venue Information'}
                </h3>

                <div className="space-y-2.5">
                  {special.businessPhone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="text-coral flex-shrink-0" size={16} />
                      <a
                        href={`tel:${special.businessPhone}`}
                        className="text-sm text-charcoal/80 hover:text-coral transition-colors"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        {special.businessPhone}
                      </a>
                    </div>
                  )}
                  {special.businessWebsite && (
                    <div className="flex items-center gap-2.5">
                      <Globe className="text-sage flex-shrink-0" size={16} />
                      <a
                        href={special.businessWebsite.startsWith('http') ? special.businessWebsite : `https://${special.businessWebsite}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-charcoal/80 hover:text-sage transition-colors truncate"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        {special.businessWebsite.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {(special.businessAddress || special.location) && (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="text-coral flex-shrink-0 mt-0.5" size={16} />
                      <span className="text-sm text-charcoal/80" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        {special.businessAddress || special.location}
                      </span>
                    </div>
                  )}
                  {special.bookingContact && isLikelyPhone(special.bookingContact) && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="text-sage flex-shrink-0" size={16} />
                      <span className="text-sm text-charcoal/80" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        {special.bookingContact}
                      </span>
                    </div>
                  )}
                  {/* Link to business profile if available */}
                  <div className="flex flex-col gap-2 mt-2">
                    {/* Message Button */}
                    {special.businessId && (
                      <Link
                        href={`/dm?business_id=${special.businessId}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-coral text-white font-semibold shadow hover:bg-coral/90 transition-colors text-sm"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        <span>Message</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8l-4 1 1-3.6A7.963 7.963 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      </Link>
                    )}
                    {/* Link to business profile if available */}
                    {special.businessSlug && (
                      <Link
                        href={`/business/${special.businessSlug}`}
                        className="inline-flex items-center gap-1 text-sm text-coral hover:text-coral/80 font-medium transition-colors"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                      >
                        View Business Profile
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </m.div>
            </div>
          </div>
            </div>
          </section>
        </div>
      </m.div>
    </AnimatePresence>
  );
}
