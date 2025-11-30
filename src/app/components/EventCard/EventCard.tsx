"use client";

import type { MouseEvent, CSSProperties } from "react";
import { Event } from "../../data/eventsData";
import Link from "next/link";
import Image from "next/image";
import { Bookmark } from "react-feather";
import { getEventIconPng } from "../../utils/eventIconToPngMapping";
import EventBadge from "./EventBadge";

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
}

export default function EventCard({ event, onBookmark }: EventCardProps) {
  const iconPng = getEventIconPng(event.icon);
  const mediaImage = getEventMediaImage(event);
  
  const handleBookmarkClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onBookmark) {
      onBookmark(event);
    }
  };
  
  return (
    <li
      className="flex w-full"
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        fontWeight: 600,
      }}
    >
      <Link href={`/event/${event.id}`} className="w-full">
        <article
          className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-visible cursor-pointer h-[600px] sm:h-auto flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-premiumElevated transition-all duration-300 hover:border-white/80 hover:-translate-y-1 hover:shadow-premiumElevatedHover"
          style={
            {
              width: "100%",
              maxWidth: "540px",
              "--width": "540",
              "--height": "600",
            } as CSSProperties
          }
        >
          {/* Glass depth overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-off-white/8 via-transparent to-transparent pointer-events-none z-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none z-0" />
          {/* MEDIA - Full bleed with premium overlay */}
          <div className="relative overflow-hidden flex-1 sm:flex-initial h-[360px] sm:h-[320px] lg:h-[240px] xl:h-[220px] z-10 rounded-t-[12px] border-b border-white/60">
            <div className="absolute inset-0 bg-gradient-to-b from-off-white/90 via-off-white/80 to-off-white/70" aria-hidden="true" />
            <div className="relative w-full h-full">
              <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
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
            <EventBadge startDate={event.startDate} endDate={event.endDate} />
          </div>

          {/* CONTENT - Minimal, premium spacing */}
          <div className="px-4 pt-4 pb-6 flex flex-col justify-between bg-gradient-to-br from-sage/12 via-sage/8 to-sage/10 gap-4 rounded-b-[12px] border-t border-white/30">
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

              {event.description && (
                <p
                  className="text-caption sm:text-xs text-charcoal/60 leading-relaxed text-center line-clamp-2"
                  style={{
                    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    fontWeight: 400
                  }}
                >
                  {event.description}
                </p>
              )}
            </div>

            {onBookmark && (
              <button
                onClick={handleBookmarkClick}
                className="w-full min-h-[44px] py-3 px-4 bg-gradient-to-br from-navbar-bg to-navbar-bg/90 rounded-full flex items-center justify-center gap-2 hover:bg-navbar-bg transition-all duration-200 text-off-white border border-sage/50"
                aria-label="Bookmark event"
                title="Bookmark"
              >
                <Bookmark className="w-5 h-5 sm:w-[18px] sm:h-[18px]" />
                <span className="text-sm font-semibold" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  Save
                </span>
              </button>
            )}
          </div>
        </article>
      </Link>
    </li>
  );
}
