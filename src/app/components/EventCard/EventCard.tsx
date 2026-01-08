"use client";

import type { MouseEvent, CSSProperties } from "react";
import { Event } from "../../data/eventsData";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight } from "react-feather";
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
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(true);

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
  
  const handleLearnMoreClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
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
          <div className="relative px-2 sm:px-2 pt-2 pb-0 overflow-hidden flex-1 sm:flex-initial h-[300px] sm:h-[320px] lg:h-[240px] xl:h-[220px] z-10">
            <div 
              className="relative w-full h-full"
              style={{
                padding: '8px',
                boxSizing: 'border-box',
              }}
            >
              <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85 rounded-[20px] shadow-sm">
                <Image
                  src={mediaImage}
                  alt={event.alt || event.title}
                  width={160}
                  height={160}
                  className="object-contain w-32 h-32 sm:w-36 sm:h-36 md:w-32 md:h-32"
                  priority={false}
                />
              </div>
            </div>

            {/* Premium glass badges */}
            <EventBadge startDate={event.startDate} endDate={event.endDate} eventId={event.id} />
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

              {/* Event or Special Description - Truncated with ellipsis for consistent layout */}
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

            <button
              onClick={handleLearnMoreClick}
              className="w-full min-h-[44px] py-3 px-4 bg-gradient-to-br from-navbar-bg to-navbar-bg/90 rounded-full flex items-center justify-center gap-2 hover:bg-navbar-bg transition-all duration-200 text-off-white border border-sage/50 shadow-md group"
              aria-label="Learn more about this event"
            >
              <span className="text-sm font-semibold" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                Learn More
              </span>
              <ArrowRight className="w-5 h-5 sm:w-[18px] sm:h-[18px] transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>
        </article>
    </motion.li>
  );
}
