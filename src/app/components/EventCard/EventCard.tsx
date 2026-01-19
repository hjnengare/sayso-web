"use client";

import type { MouseEvent, CSSProperties } from "react";
import { Event } from "../../data/eventsData";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getEventIconPng } from "../../utils/eventIconToPngMapping";
import EventBadge from "./EventBadge";
import { motion, useReducedMotion } from "framer-motion";
import { useState, useEffect } from "react";

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

const getEventMediaImage = (event: Event) => {
  // Priority 0: Uploaded images array (newer events)
  const uploadedImages = (event as any).uploaded_images as string[] | undefined;
  if (uploadedImages && Array.isArray(uploadedImages) && uploadedImages.length > 0) {
    const first = uploadedImages.find((img) => typeof img === "string" && img.trim()) || uploadedImages[0];
    if (first && typeof first === "string" && first.trim()) {
      return first;
    }
  }

  // Priority 1: Use real uploaded images from event
  if (event.image && event.image.trim()) {
    return event.image;
  }

  // Priority 1b: Common API aliases
  if ((event as any).image_url && typeof (event as any).image_url === "string" && (event as any).image_url.trim()) {
    return (event as any).image_url as string;
  }

  if ((event as any).heroImage && typeof (event as any).heroImage === "string" && (event as any).heroImage.trim()) {
    return (event as any).heroImage as string;
  }

  if ((event as any).bannerImage && typeof (event as any).bannerImage === "string" && (event as any).bannerImage.trim()) {
    return (event as any).bannerImage as string;
  }

  // Priority 2: Use business image carousel if available (for business-owned events)
  if ((event as any).businessImages && (event as any).businessImages.length > 0) {
    return (event as any).businessImages[0];
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
  onBookmark?: (event: Event) => void;
  index?: number;
}

export default function EventCard({ event, onBookmark, index = 0 }: EventCardProps) {
  const router = useRouter();
  const iconPng = getEventIconPng(event.icon);
  const mediaImage = getEventMediaImage(event);
  const hasRealImage = Boolean(event.image?.trim() || (event as any).businessImages?.length);
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(true);
  // PNG fallback icons don't need loading state - only real images do
  const [imageLoaded, setImageLoaded] = useState(!hasRealImage);
  const showLoadingOverlay = hasRealImage && !imageLoaded;

  // Check if mobile for animation
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation variants
  const cardInitial = prefersReducedMotion
    ? { opacity: 0 }
    : isMobile
    ? { opacity: 0 }
    : { opacity: 0, y: 40, x: index % 2 === 0 ? -20 : 20 };

  const cardAnimate = prefersReducedMotion
    ? { opacity: 1 }
    : isMobile
    ? { opacity: 1 }
    : { opacity: 1, y: 0, x: 0 };
  
  // Determine booking behavior based on event source
  const getBookingInfo = () => {
    // Ticketmaster events (have ticketmaster_url or similar)
    if ((event as any).ticketmaster_url) {
      return {
        type: 'ticketmaster' as const,
        url: (event as any).ticketmaster_url,
        label: 'Reserve your spot',
      };
    }

    // Business-owned events with booking URL
    if ((event as any).bookingUrl && (event as any).bookingUrl.trim()) {
      return {
        type: 'booking_url' as const,
        url: (event as any).bookingUrl,
        label: 'Reserve your spot',
      };
    }

    // Business-owned events with custom contact message
    if ((event as any).bookingContact && (event as any).bookingContact.trim()) {
      return {
        type: 'contact_only' as const,
        label: (event as any).bookingContact,
      };
    }

    // Default: limited availability message
    return {
      type: 'no_booking' as const,
      label: 'Learn more',
    };
  };

  const bookingInfo = getBookingInfo();

  const handlePrimaryAction = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (bookingInfo.type === 'ticketmaster' || bookingInfo.type === 'booking_url') {
      window.open(bookingInfo.url, '_blank', 'noopener,noreferrer');
      return;
    }

    router.push(`/event/${event.id}`);
  };

  return (
    <motion.li
      className="flex w-full"
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        fontWeight: 600,
      }}
      initial={cardInitial}
      whileInView={cardAnimate}
      viewport={{ amount: isMobile ? 0.1 : 0.2, once: false }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : isMobile ? 0.4 : 0.5,
        delay: index * 0.05,
        ease: "easeOut",
      }}
    >
      <article
        className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-visible h-[600px] sm:h-auto flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-md w-full"
        style={
          {
            width: "100%",
            maxWidth: "540px",
            "--width": "540",
            "--height": "600",
          } as CSSProperties
        }
      >
         
          {/* MEDIA - Full bleed with premium overlay */}
          <div className="relative px-1 pt-1 pb-0 overflow-hidden flex-1 sm:flex-initial h-[300px] sm:h-[320px] lg:h-[240px] xl:h-[220px] z-10">
            <div 
              className="relative w-full h-full"
            >
              <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85 rounded-[20px] shadow-sm">
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
                  sizes="(max-width: 640px) 100vw, 540px"
                  className={hasRealImage ? 'object-cover' : 'object-contain w-32 h-32 sm:w-36 sm:h-36 md:w-32 md:h-32'}
                  quality={hasRealImage ? 90 : undefined}
                  priority={false}
                  onLoadingComplete={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
              </div>
            </div>

            {/* Premium glass badges */}
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
          <div className="px-4 pt-4 pb-6 flex flex-col justify-between bg-gradient-to-br from-sage/12 via-sage/8 to-sage/10 gap-4 rounded-b-[20px]">
            <div className="flex flex-col items-center text-center gap-3">
              <h3
                className="text-h2 sm:text-h1 font-bold leading-tight text-charcoal text-center truncate"
                style={{
                  fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                  fontWeight: 700,
                  letterSpacing: '-0.01em'
                }}
              >
                {event.title}
              </h3>

              <div className="w-full">
                <p
                  className="text-caption sm:text-xs text-charcoal/60 leading-relaxed text-center overflow-hidden text-ellipsis line-clamp-2"
                  style={{
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    fontWeight: 600,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    wordBreak: 'break-word',
                  }}
                  title={event.description || undefined}
                >
                  {event.description || (event.type === "event" ? "Join us for this exciting event!" : "Don't miss out on this special offer!")}
                </p>
              </div>
            </div>

            {(bookingInfo.type === 'ticketmaster' || bookingInfo.type === 'booking_url') ? (
              // Clickable booking button for external URLs
              <button
                onClick={handlePrimaryAction}
                className="w-full min-h-[44px] py-3 px-4 bg-gradient-to-br from-navbar-bg to-navbar-bg/90 rounded-full flex items-center justify-center gap-2 hover:bg-navbar-bg transition-all duration-200 text-off-white border border-sage/50 shadow-md group"
                aria-label={bookingInfo.label}
                title={bookingInfo.type === 'ticketmaster' ? 'Opens Ticketmaster in a new tab' : 'Opens booking page in a new tab'}
              >
                <span className="text-sm font-semibold" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  {bookingInfo.label}
                </span>
                <ArrowRight className="w-5 h-5 sm:w-[18px] sm:h-[18px] transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            ) : (
              // Route to event detail for limited availability / contact-only cases
              <button
                onClick={handlePrimaryAction}
                className="w-full min-h-[44px] py-3 px-4 rounded-full flex items-center justify-center gap-2 text-off-white bg-navbar-bg/90 border border-navbar-bg/70 shadow-sm hover:bg-navbar-bg transition-colors group"
                aria-label={bookingInfo.type === 'contact_only' ? 'View event details for booking instructions' : 'View event details'}
                title={bookingInfo.type === 'contact_only' ? 'View details and booking instructions' : 'Limited availability — view event details'}
              >
                <span className="text-sm font-semibold" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  {bookingInfo.label}
                </span>
                <ArrowRight className="w-5 h-5 sm:w-[18px] sm:h-[18px] transition-transform duration-200 group-hover:translate-x-1 text-off-white" />
              </button>
            )}
          </div>
        </article>
    </motion.li>
  );
}
