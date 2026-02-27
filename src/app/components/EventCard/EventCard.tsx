"use client";

import type { MouseEvent } from "react";
import type { Event } from "../../lib/types/Event";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { m } from "framer-motion";
import { Star, Edit, Bookmark, Share2 } from "lucide-react";
import { getEventIconPng } from "../../utils/eventIconToPngMapping";
import EventBadge from "./EventBadge";
import { useState, memo, useEffect, useMemo, useRef } from "react";
import { useSavedItems } from "../../contexts/SavedItemsContext";
import { useToast } from "../../contexts/ToastContext";
import { useEventRatings } from "../../hooks/useEventRatings";

const EVENT_IMAGE_BASE_PATH = "/png";
const loadedEventImageKeys = new Set<string>();

// Tiny 4x3 SVG for instant visual fill while image loads
const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSIzIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjMiIGZpbGw9IiNlNWUwZTUiLz48L3N2Zz4=";

const SPECIAL_FOOD_KEYWORDS = [
  "food",
  "pizza",
  "meal",
  "dinner",
  "lunch",
  "breakfast",
  "brunch",
  "snack",
  "burger",
  "kitchen",
  "restaurant",
];

const SPECIAL_DRINK_KEYWORDS = [
  "cocktail",
  "beer",
  "wine",
  "drink",
  "bar",
  "happy hour",
  "brew",
  "wine",
];

const EVENT_SPORT_KEYWORDS = [
  "yoga",
  "sport",
  "fitness",
  "run",
  "park",
  "outdoor",
  "dance",
  "music",
];

const fixImageUrl = (url: string): string =>
  url.startsWith("//") ? `https:${url}` : url;

const getImageCacheKey = (url: string): string => {
  const normalizedUrl = fixImageUrl(url.trim());
  if (!normalizedUrl) return "";

  if (normalizedUrl.startsWith("/")) {
    return normalizedUrl.toLowerCase();
  }

  try {
    const parsed = new URL(normalizedUrl);
    return `${parsed.origin}${parsed.pathname}${parsed.search}`.toLowerCase();
  } catch {
    return normalizedUrl.toLowerCase();
  }
};

const isFallbackEventArtwork = (url: string): boolean =>
  getImageCacheKey(url).startsWith(`${EVENT_IMAGE_BASE_PATH}/`);

const getEventMediaImage = (event: Event) => {
  // Priority 0: Uploaded images array (newer events)
  const uploadedImages = (event as any).uploaded_images as string[] | undefined;
  if (uploadedImages && Array.isArray(uploadedImages) && uploadedImages.length > 0) {
    const first = uploadedImages.find((img) => typeof img === "string" && img.trim()) || uploadedImages[0];
    if (first && typeof first === "string" && first.trim()) {
      return fixImageUrl(first);
    }
  }

  // Priority 1: Use real uploaded images from event
  if (event.image && event.image.trim()) {
    return fixImageUrl(event.image);
  }

  // Priority 1b: Common API aliases
  if ((event as any).image_url && typeof (event as any).image_url === "string" && (event as any).image_url.trim()) {
    return fixImageUrl((event as any).image_url as string);
  }

  if ((event as any).heroImage && typeof (event as any).heroImage === "string" && (event as any).heroImage.trim()) {
    return fixImageUrl((event as any).heroImage as string);
  }

  if ((event as any).bannerImage && typeof (event as any).bannerImage === "string" && (event as any).bannerImage.trim()) {
    return fixImageUrl((event as any).bannerImage as string);
  }

  // Priority 2: Use business image carousel if available (for business-owned events)
  if ((event as any).businessImages && (event as any).businessImages.length > 0) {
    return fixImageUrl((event as any).businessImages[0]);
  }

  // Fallback: Generate icon based on event type/keywords
  const haystack = `${event.title} ${event.description ?? ""}`.toLowerCase();

  if (event.type === "event") {
    if (EVENT_SPORT_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
      return `${EVENT_IMAGE_BASE_PATH}/033-sport.png`;
    }

    if (haystack.includes("yoga")) {
      return `${EVENT_IMAGE_BASE_PATH}/015-yoga.png`;
    }

    if (haystack.includes("music") || haystack.includes("concert")) {
      return `${EVENT_IMAGE_BASE_PATH}/040-stage.png`;
    }

    return `${EVENT_IMAGE_BASE_PATH}/022-party-people.png`;
  }

  if (SPECIAL_DRINK_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return `${EVENT_IMAGE_BASE_PATH}/007-beer-tap.png`;
  }

  if (SPECIAL_FOOD_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return `${EVENT_IMAGE_BASE_PATH}/031-fast-food.png`;
  }

  return `${EVENT_IMAGE_BASE_PATH}/025-open-book.png`;
};

interface EventCardProps {
  event: Event;
  index?: number;
  dateRibbonPosition?: "corner" | "middle";
  fullWidth?: boolean;
}

function EventCard({
  event,
  index = 0,
  dateRibbonPosition = "corner",
  fullWidth = false,
}: EventCardProps) {
  const router = useRouter();
  const { toggleSavedItem, isItemSaved } = useSavedItems();
  const { showToast } = useToast();
  const eventMediaLayoutId = `event-media-${event.id}`;
  const eventTitleLayoutId = `event-title-${event.id}`;
  const iconPng = getEventIconPng(event.icon);
  const mediaImage = getEventMediaImage(event);
  const mediaImageCacheKey = useMemo(() => getImageCacheKey(mediaImage), [mediaImage]);
  const hasRealImage = !isFallbackEventArtwork(mediaImage);
  const [imageLoaded, setImageLoaded] = useState(
    () => !hasRealImage || (mediaImageCacheKey ? loadedEventImageKeys.has(mediaImageCacheKey) : true)
  );
  const showLoadingOverlay = hasRealImage && !imageLoaded;

  const eventDetailHref = event.type === "event" ? `/event/${event.id}` : `/special/${event.id}`;
  const reviewRoute = event.type === "event" ? `/write-review/event/${event.id}` : `/write-review/special/${event.id}`;
  const detailTypeLabel = event.type === "special" ? "Special" : "Event";
  const detailCtaLabel = `View ${detailTypeLabel}`;
  const detailAriaLabel = `View ${event.type} details`;
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prefetch destination route on mount for the first visible cards.
  useEffect(() => {
    if (index > 1) return;
    if (typeof window === "undefined") return;

    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const prefetch = () => {
      try {
        router.prefetch(eventDetailHref);
      } catch {
        // Ignore prefetch failures.
      }
    };

    const idleCallback = (window as any).requestIdleCallback;
    if (typeof idleCallback === "function") {
      idleId = idleCallback(prefetch, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(prefetch, 200);
    }

    return () => {
      if (idleId !== null && typeof (window as any).cancelIdleCallback === "function") {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [eventDetailHref, index, router]);

  const handleCardMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      try {
        router.prefetch(eventDetailHref);
      } catch {
        // Ignore hover prefetch failures.
      }
    }, 100);
  };

  const handleCardMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleCardTouchStart = () => {
    try {
      router.prefetch(eventDetailHref);
    } catch {
      // Ignore touch-intent prefetch failures.
    }
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasRealImage) {
      setImageLoaded(true);
      return;
    }

    if (!mediaImageCacheKey) {
      setImageLoaded(true);
      return;
    }

    setImageLoaded(loadedEventImageKeys.has(mediaImageCacheKey));
  }, [hasRealImage, mediaImageCacheKey]);

  const initialReviews = (event as any).reviews ?? (event as any).totalReviews ?? 0;
  const { rating: liveRating, totalReviews: liveTotalReviews } = useEventRatings(
    event.id,
    Number(event.rating ?? 0),
    initialReviews
  );
  const hasRating = liveRating != null && Number(liveRating) > 0;
  const displayRating = hasRating ? Number(liveRating) : undefined;
  const reviews = liveTotalReviews ?? 0;
  const hasReviewed = false;

  // Smart countdown state
  const [countdown, setCountdown] = useState<{ 
    days: number; 
    hours: number; 
    minutes: number; 
    show: boolean;
    status: 'upcoming' | 'live' | 'ended';
  }>({ 
    days: 0, 
    hours: 0, 
    minutes: 0, 
    show: false,
    status: 'ended'
  });

  // Calculate countdown to event start
  useEffect(() => {
    const calculateCountdown = () => {
      const startDate = event.startDateISO || event.startDate;
      const endDate = event.endDateISO || event.endDate;
      
      if (!startDate) {
        setCountdown({ days: 0, hours: 0, minutes: 0, show: false, status: 'ended' });
        return;
      }

      const now = new Date().getTime();
      const eventStartTime = new Date(startDate).getTime();
      const eventEndTime = endDate ? new Date(endDate).getTime() : eventStartTime + (24 * 60 * 60 * 1000); // Default to 24h after start if no end date
      
      // Event has ended
      if (now > eventEndTime) {
        setCountdown({ days: 0, hours: 0, minutes: 0, show: false, status: 'ended' });
        return;
      }

      // Event is currently happening
      if (now >= eventStartTime && now <= eventEndTime) {
        setCountdown({ days: 0, hours: 0, minutes: 0, show: true, status: 'live' });
        return;
      }

      // Event is upcoming
      const diff = eventStartTime - now;
      
      // Only show countdown if event is within 30 days
      if (diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        setCountdown({ days, hours, minutes, show: true, status: 'upcoming' });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, show: false, status: 'upcoming' });
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [event.startDateISO, event.startDate, event.endDateISO, event.endDate]);

  const handleWriteReview = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasReviewed) router.push(reviewRoute);
  };

  const handleBookmark = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSavedItem(event.id);
  };

  const handleShare = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${eventDetailHref}`;
      const shareText = `Check out ${event.title} on sayso!`;
      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ title: event.title, text: shareText, url: shareUrl })) {
        await navigator.share({ title: event.title, text: shareText, url: shareUrl });
        showToast("Shared successfully!", "success", 2000);
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Link copied to clipboard!", "success", 2000);
      } else {
        showToast("Failed to copy link.", "sage", 3000);
      }
    } catch {
      showToast("Failed to share. Please try again.", "sage", 3000);
    }
  };

  // Determine star gradient tier based on rating
  const starGradientId = useMemo(() => {
    if (!displayRating) return null;
    return displayRating > 4.0 ? 'Gold' : displayRating > 2.0 ? 'Bronze' : 'Low';
  }, [displayRating]);

  return (
    <li
      className={fullWidth ? "flex w-full" : "flex w-[100vw] sm:w-auto sm:w-[260px] md:w-[340px]"}
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        fontWeight: 600,
      }}
    >
      {/* SVG Gradient Definitions for Star Icons */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {/* Gold Gradient: warm yellow → soft amber */}
          <linearGradient id="starGradientGoldEvent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#F5D547', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#E6A547', stopOpacity: 1 }} />
          </linearGradient>
          {/* Bronze Gradient: muted orange → brown */}
          <linearGradient id="starGradientBronzeEvent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#D4915C', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#8B6439', stopOpacity: 1 }} />
          </linearGradient>
          {/* Low Rating Gradient: soft red → charcoal */}
          <linearGradient id="starGradientLowEvent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#D66B6B', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#6B5C5C', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>
      
      <Link
        href={eventDetailHref}
        prefetch={false}
        className="block w-full"
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
        onTouchStart={handleCardTouchStart}
      >
      <article
        className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden group cursor-pointer w-full flex flex-col backdrop-blur-xl shadow-md pb-4"
      >
          {/* MEDIA - Full bleed with premium overlay */}
          <div className="relative w-full flex-shrink-0 z-10">
            <m.div
              layoutId={eventMediaLayoutId}
              className="relative w-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85 h-[280px] sm:h-[300px] md:h-[220px]"
            >
              {showLoadingOverlay && (
                <div className="absolute inset-0 bg-charcoal/5 animate-pulse z-10 flex items-center justify-center">
                  <span className="w-10 h-10 border-2 border-white/50 border-t-navbar-bg rounded-full animate-spin" aria-hidden />
                  <span className="sr-only">Loading image</span>
                </div>
              )}
              <Image
                src={mediaImage}
                alt={event.alt || event.title}
                fill
                sizes="(max-width: 640px) 85vw, 340px"
                className={hasRealImage ? "object-cover card-img-zoom sm:group-active:scale-[0.98] motion-reduce:transition-none" : "object-contain w-32 h-32 sm:w-36 sm:h-36 md:w-32 md:h-32 card-img-zoom sm:group-active:scale-[0.98] motion-reduce:transition-none"}
                quality={hasRealImage ? 75 : 60}
                priority={false}
                onLoadingComplete={() => {
                  if (mediaImageCacheKey) {
                    loadedEventImageKeys.add(mediaImageCacheKey);
                  }
                  setImageLoaded(true);
                }}
                onError={() => {
                  if (mediaImageCacheKey) {
                    loadedEventImageKeys.add(mediaImageCacheKey);
                  }
                  setImageLoaded(true);
                }}
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />
              <div
                className="absolute inset-0 pointer-events-none z-[1] card-overlay-fade motion-reduce:transition-none"
                style={{ background: "hsla(0, 0%, 0%, 0.2)" }}
                aria-hidden="true"
              />

              {/* Rating badge - same style as Business Card */}
              {hasRating && displayRating !== undefined && (
                <div className="absolute right-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-full p-1" aria-hidden>
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill={`url(#starGradient${starGradientId}Event)`} stroke={`url(#starGradient${starGradientId}Event)`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>{Number(displayRating).toFixed(1)}</span>
                </div>
              )}

              {/* Floating actions - same style as Business Card (desktop only) */}
              <div data-event-card-action className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-2 transition-all duration-300 ease-out translate-x-12 opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100">
                <button
                  type="button"
                  className={`w-10 h-10 bg-off-white/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 shadow-md active:translate-y-[1px] transform-gpu touch-manipulation select-none ${hasReviewed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-off-white/60 hover:scale-110 hover:text-charcoal/90 active:scale-95'}`}
                  onClick={handleWriteReview}
                  disabled={hasReviewed}
                  aria-label={hasReviewed ? `You have already reviewed ${event.title}` : `Write a review for ${event.title}`}
                  title={hasReviewed ? 'Already reviewed' : 'Write a review'}
                >
                  <Edit className={`w-4 h-4 ${hasReviewed ? 'text-charcoal/40' : 'text-charcoal/80'}`} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className="w-10 h-10 bg-off-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-off-white/60 hover:scale-110 hover:text-charcoal/90 active:scale-95 active:translate-y-[1px] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 shadow-md transform-gpu touch-manipulation select-none"
                  onClick={handleBookmark}
                  aria-label={isItemSaved(event.id) ? `Remove from saved ${event.title}` : `Save ${event.title}`}
                  title={isItemSaved(event.id) ? 'Remove from saved' : 'Save'}
                >
                  <Bookmark className={`w-4 h-4 ${isItemSaved(event.id) ? 'text-charcoal/80 fill-charcoal/80' : 'text-charcoal/80'}`} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className="w-10 h-10 bg-off-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-off-white/60 hover:scale-110 hover:text-charcoal/90 active:scale-95 active:translate-y-[1px] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 shadow-md transform-gpu touch-manipulation select-none"
                  onClick={handleShare}
                  aria-label={`Share ${event.title}`}
                  title="Share"
                >
                  <Share2 className="w-4 h-4 text-charcoal/80" strokeWidth={2.5} />
                </button>
              </div>

              {/* Smart Countdown Badge */}
              {countdown.show && countdown.status === "upcoming" && (
                <div className="absolute left-3 bottom-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-off-white/95 backdrop-blur-md px-3 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
                  <>
                    {countdown.days > 0 && (
                      <div className="flex items-baseline gap-0.5">
                        <span
                          className="text-xs font-bold text-charcoal/90 leading-none"
                          style={{
                            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                            fontWeight: 700,
                          }}
                        >
                          {countdown.days}
                        </span>
                        <span
                          className="text-[10px] font-medium text-charcoal/90 leading-none"
                          style={{
                            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                          }}
                        >
                          d
                        </span>
                      </div>
                    )}
                    {(countdown.days > 0 || countdown.hours > 0) && (
                      <div className="flex items-baseline gap-0.5">
                        <span
                          className="text-xs font-bold text-charcoal/90 leading-none"
                          style={{
                            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                            fontWeight: 700,
                          }}
                        >
                          {countdown.hours}
                        </span>
                        <span
                          className="text-[10px] font-medium text-charcoal/90 leading-none"
                          style={{
                            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                          }}
                        >
                          h
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-0.5">
                      <span
                        className="text-xs font-bold text-charcoal/90 leading-none"
                        style={{
                          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                          fontWeight: 700,
                        }}
                      >
                        {countdown.minutes}
                      </span>
                      <span
                        className="text-[10px] font-medium text-charcoal/90 leading-none"
                        style={{
                          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        }}
                      >
                        m
                      </span>
                    </div>
                  </>
                </div>
              )}
            </m.div>

            {/* Date ribbon badge */}
            <EventBadge
              startDate={event.startDate}
              endDate={event.endDate}
              startDateISO={event.startDateISO}
              endDateISO={event.endDateISO}
              occurrences={event.occurrences}
              eventId={event.id}
              position={dateRibbonPosition}
            />
          </div>

          {/* CONTENT - Minimal, premium spacing */}
          <div
            className={`px-4 ${dateRibbonPosition === "middle" ? "pt-7" : "pt-3"} pb-0 bg-gradient-to-b from-card-bg/95 to-card-bg gap-2 rounded-b-[12px]`}
          >
            <div className="flex flex-col gap-2">
              <m.h3
                layoutId={eventTitleLayoutId}
                className="text-base sm:text-lg font-bold text-charcoal leading-tight line-clamp-1 transition-colors duration-300 group-hover:text-navbar-bg/90"
                style={{
                  fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                  fontWeight: 700,
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  textRendering: 'optimizeLegibility',
                }}
              >
                {event.title}
              </m.h3>

              <div className="w-full">
                <p
                  className="text-sm text-charcoal/70 line-clamp-2 leading-snug"
                  style={{
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    fontWeight: 400,
                  }}
                  title={event.description || undefined}
                >
                  {event.description || (event.type === "event" ? "Join us for this exciting event!" : "Don't miss out on this special offer!")}
                </p>
              </div>
            </div>

            {event.occurrencesCount != null && event.occurrencesCount > 1 && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card-bg/10 text-sage text-sm font-medium w-fit"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
              >
                {event.occurrencesCount} dates available
              </span>
            )}
            {event.type === "event" && !event.businessId && !event.isExternalEvent && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium w-fit ${
                  "bg-coral/10 text-coral"
                }`}
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
              >
                Community-hosted event
              </span>
            )}
            {/* Review count - same styling as Business Card */}
            <div className="flex flex-col items-center gap-1 mb-0.5 pt-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <div className="inline-flex items-center justify-center gap-1 min-h-[12px]">
                {hasRating && displayRating !== undefined ? (
                  <>
                    <span
                      role="link"
                      tabIndex={0}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(eventDetailHref); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(eventDetailHref); } }}
                      className="inline-flex items-center justify-center text-body-sm sm:text-base font-bold leading-none text-navbar-bg underline-offset-2 cursor-pointer transition-colors duration-200 hover:text-coral"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 700 }}
                    >
                      {reviews}
                    </span>
                    <span
                      role="link"
                      tabIndex={0}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(eventDetailHref); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(eventDetailHref); } }}
                      className="inline-flex items-center justify-center text-sm leading-none text-navbar-bg underline-offset-2 cursor-pointer transition-colors duration-200 hover:text-coral"
                      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}
                    >
                      Reviews
                    </span>
                  </>
                ) : (
                  <span
                    role="button"
                    tabIndex={hasReviewed ? -1 : 0}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!hasReviewed) router.push(reviewRoute); }}
                    onKeyDown={(e) => { if (!hasReviewed && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); router.push(reviewRoute); } }}
                    className={`inline-flex items-center justify-center text-sm font-normal underline-offset-2 min-w-[92px] text-center transition-colors duration-200 ${hasReviewed ? 'text-charcoal/70 cursor-not-allowed' : 'text-charcoal cursor-pointer hover:text-coral'}`}
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}
                    aria-disabled={hasReviewed}
                    title={hasReviewed ? 'You have already reviewed this event' : 'Be the first to review'}
                  >
                    {hasReviewed ? 'Already reviewed' : 'Be the first to review'}
                  </span>
                )}
              </div>
            </div>
            
            {/* Desktop details button */}
            <div className="hidden md:flex items-center justify-center pt-2 pb-0.5 px-1">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(eventDetailHref); }}
                className="w-full flex items-center justify-center px-4 py-2.5 rounded-full text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sage/40 border transition-all duration-200 shadow-md bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white border-sage/50 hover:scale-[1.02] active:scale-95 active:translate-y-[1px] transform-gpu touch-manipulation select-none"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                aria-label={detailAriaLabel}
              >
                {detailCtaLabel}
              </button>
            </div>
            
            {/* Mobile details button */}
            <div className="md:hidden flex items-center justify-center pt-1.5 pb-1 px-1">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(eventDetailHref); }}
                className="w-full flex items-center justify-center px-4 py-3 rounded-full text-caption sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sage/40 border transition-all duration-200 min-h-[48px] shadow-md bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white border-sage/50 active:scale-95 active:translate-y-[1px] transform-gpu touch-manipulation select-none"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                aria-label={detailAriaLabel}
              >
                {detailCtaLabel}
              </button>
            </div>
          </div>
        </article>
      </Link>
    </li>
  );
}

// Memoize to prevent re-renders when parent list updates
export default memo(EventCard);
