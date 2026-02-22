// src/components/EventDetail/EventDescription.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { m } from "framer-motion";
import type { Event } from "../../lib/types/Event";
import { normalizeDescriptionText } from "../../lib/utils/descriptionText";

interface EventDescriptionProps {
  event: Event;
}

export default function EventDescription({ event }: EventDescriptionProps) {
  const normalizedDescription =
    normalizeDescriptionText(event.description) ||
    "Join us for an amazing experience! This event promises to be unforgettable with great company, beautiful surroundings, and memorable moments. Don't miss out on this special opportunity to connect with like-minded people and create lasting memories.";
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsible, setIsCollapsible] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  const [expandedHeight, setExpandedHeight] = useState<number | null>(null);

  const animatedHeight = useMemo(() => {
    if (!isCollapsible) return "auto";
    if (isExpanded) return expandedHeight ?? "auto";
    return collapsedHeight ?? "auto";
  }, [collapsedHeight, expandedHeight, isCollapsible, isExpanded]);

  useEffect(() => {
    const measure = () => {
      const el = contentRef.current;
      if (!el) return;

      const styles = window.getComputedStyle(el);
      const parsedLineHeight = Number.parseFloat(styles.lineHeight);
      const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : 28;
      const nextCollapsedHeight = Math.round(lineHeight * 5);
      const nextExpandedHeight = Math.ceil(el.scrollHeight);
      const shouldCollapse = nextExpandedHeight > nextCollapsedHeight + 4;

      setCollapsedHeight(nextCollapsedHeight);
      setExpandedHeight(nextExpandedHeight);
      setIsCollapsible(shouldCollapse);

      if (!shouldCollapse) {
        setIsExpanded(false);
      }
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [normalizedDescription]);

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px]  shadow-md p-4 sm:p-6 relative"
    >
      {/* Gradient overlays matching user profile */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>
      
      <div className="relative z-10">
        <h2
          className="text-h3 font-semibold text-charcoal mb-3"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          About This Event
        </h2>

        <m.div
          initial={false}
          animate={{ height: animatedHeight }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden"
        >
          <p
            ref={contentRef}
            className="text-body text-charcoal/70 leading-7 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {normalizedDescription}
          </p>

          {isCollapsible && !isExpanded && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card-bg via-card-bg/95 to-transparent" />
          )}
        </m.div>

        {isCollapsible && (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="mt-3 text-sm font-semibold text-coral hover:text-coral/80 transition-colors duration-200"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {isExpanded ? "Read less" : "Read more"}
          </button>
        )}
      </div>
    </m.div>
  );
}
