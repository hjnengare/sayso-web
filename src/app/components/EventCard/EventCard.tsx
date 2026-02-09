"use client";

import type { MouseEvent, CSSProperties } from "react";
import type { Event } from "../../lib/types/Event";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getEventIconPng } from "../../utils/eventIconToPngMapping";
import EventBadge from "./EventBadge";
import { useState, memo } from "react";

const EVENT_IMAGE_BASE_PATH = "/png";

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
}

function EventCard({ event, index: _index = 0 }: EventCardProps) {
  const router = useRouter();
  const iconPng = getEventIconPng(event.icon);
  const mediaImage = getEventMediaImage(event);
  const hasRealImage = Boolean(event.image?.trim() || (event as any).businessImages?.length);
  // PNG fallback icons don't need loading state - only real images do
  const [imageLoaded, setImageLoaded] = useState(!hasRealImage);
  const showLoadingOverlay = hasRealImage && !imageLoaded;
  
  // Always show 'Learn More' and always route to detail page
  const handlePrimaryAction = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Route to event or special detail page
    if (event.type === 'special') {
      router.push(`/specials/${event.id}`);
    } else {
      router.push(`/event/${event.id}`);
    }
  };

  return (
    <li
      className="flex w-full h-full"
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        fontWeight: 600,
      }}
    >
      <article
        className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden group cursor-pointer w-full h-full flex flex-col border border-white/60 backdrop-blur-xl shadow-md transition-all duration-300 hover:border-white/80 hover:-translate-y-1 hover:shadow-lg md:w-[340px]"
        style={{ maxWidth: "540px" } as CSSProperties}
      >
          {/* MEDIA - Full bleed with premium overlay */}
          <div className="relative w-full flex-shrink-0 z-10 p-1">
            <div className="relative w-full overflow-hidden rounded-[12px] flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85" style={{ aspectRatio: '4 / 3' }}>
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
                className={hasRealImage ? 'object-cover' : 'object-contain w-32 h-32 sm:w-36 sm:h-36 md:w-32 md:h-32'}
                quality={hasRealImage ? 75 : 60}
                priority={false}
                onLoadingComplete={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            </div>

            {/* Date ribbon badge */}
            <EventBadge
              startDate={event.startDate}
              endDate={event.endDate}
              startDateISO={event.startDateISO}
              endDateISO={event.endDateISO}
              occurrences={event.occurrences}
              eventId={event.id}
            />
          </div>

          {/* CONTENT - Minimal, premium spacing */}
          <div className="px-4 py-4 bg-gradient-to-b from-card-bg/95 to-card-bg flex flex-col gap-2 rounded-b-[12px] flex-1">
            <div className="flex flex-col gap-2">
              <h3
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
              </h3>

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
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sage/10 text-sage text-sm font-medium w-fit"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
              >
                {event.occurrencesCount} dates available
              </span>
            )}

            <button
              onClick={handlePrimaryAction}
              className="mt-auto w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white rounded-full text-sm font-semibold hover:from-navbar-bg/90 hover:to-navbar-bg/80 active:scale-95 active:translate-y-[1px] transition-all duration-200 shadow-md border border-sage/50 focus:outline-none focus:ring-2 focus:ring-sage/40 transform-gpu touch-manipulation select-none"
              aria-label="Learn more about this event"
              title="View event details"
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 600,
              }}
            >
              <span>View event</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </article>
    </li>
  );
}

// Memoize to prevent re-renders when parent list updates
export default memo(EventCard);
