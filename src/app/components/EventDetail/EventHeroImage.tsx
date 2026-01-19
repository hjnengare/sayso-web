// src/components/EventDetail/EventHeroImage.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Heart, Star } from "lucide-react";
import { Event } from "../../data/eventsData";

interface EventHeroImageProps {
  event: Event;
  isLiked: boolean;
  onLike: () => void;
}

// Helper to get optimized image URL with width parameter
function getOptimizedImageUrl(url: string | null, width: number = 1080): string {
  if (!url) {
    return "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1920&h=1080&fit=crop&crop=center&q=90";
  }

  // If already has query params or is Supabase storage URL, return as-is
  if (url.includes('?') || url.includes('supabase.co/storage')) {
    return url;
  }

  // Try to add width and auto format parameters
  try {
    // Handle relative URLs
    if (url.startsWith('/')) {
      return url; // Return relative URLs as-is, Next.js Image will handle optimization
    }

    // Handle absolute URLs
    const urlObj = new URL(url);
    urlObj.searchParams.set('width', width.toString());
    urlObj.searchParams.set('auto', 'format');
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

export default function EventHeroImage({
  event,
  isLiked,
  onLike,
}: EventHeroImageProps) {
  // Get optimized image URL with width parameter
  const imageUrl = getOptimizedImageUrl(event.image, 1080);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] rounded-[20px] overflow-hidden border border-white/60 ring-1 ring-white/30"
    >
      <Image
        src={imageUrl}
        alt={event.alt || event.title}
        fill
        className="object-contain"
        priority
        quality={100}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 1080px"
        style={{ objectFit: 'contain' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      {/* Event Type Badge */}
      <div className="absolute top-6 left-6">
        <span className={`px-4 py-2 rounded-full text-body-sm font-600 backdrop-blur-xl border ${
          event.type === "event"
            ? "bg-coral/90 text-white border-coral/50"
            : "bg-sage/90 text-white border-sage/50"
        }`} style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
          {event.type === "event" ? "Event" : "Special"}
        </span>
      </div>

      {event.rating != null && (
        <div className="absolute top-6 right-6 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border border-white/40">
          <Star className="w-3.5 h-3.5 text-coral fill-coral" aria-hidden />
          <span className="text-body-sm font-semibold text-charcoal" style={{ 
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', 
            fontWeight: 600
          }}>
            {Number(event.rating).toFixed(1)}
          </span>
        </div>
      )}

      {/* Like Button */}
      <button
        onClick={onLike}
        className={`absolute bottom-6 right-6 w-12 h-12 rounded-full backdrop-blur-xl border transition-all duration-300 hover:scale-110 ${
          isLiked
            ? "bg-coral/90 text-white border-coral/50"
            : "bg-white/20 text-white border-white/30 hover:bg-white/30"
        }`}
        aria-label="Like event"
      >
        <Heart className={`mx-auto ${isLiked ? "fill-current" : ""}`} size={20} />
      </button>
    </motion.div>
  );
}
