// src/components/BusinessDetail/BusinessHeroImage.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Heart, Star } from "react-feather";

interface BusinessHeroImageProps {
  image: string;
  alt: string;
  rating: number;
  isLiked: boolean;
  onLike: () => void;
  verified?: boolean;
}

export default function BusinessHeroImage({
  image,
  alt,
  rating,
  isLiked,
  onLike,
  verified = false,
}: BusinessHeroImageProps) {
  const hasImage = image && image.trim() !== '';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] rounded-2xl overflow-hidden border border-white/60 ring-1 ring-white/30"
    >
      {hasImage ? (
        <>
          <Image
            src={image}
            alt={alt}
            fill
            className="object-cover object-center"
            priority
            quality={90}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
            style={{ objectFit: 'cover' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal/20 via-charcoal/10 to-off-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
              <Star className="w-10 h-10 sm:w-12 sm:h-12 text-navbar-bg" strokeWidth={1.5} />
            </div>
            <p className="text-body-sm text-white/70 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              Image coming soon
            </p>
          </div>
        </div>
      )}

      {/* Verified Badge */}
      {verified && (
        <div className="absolute top-6 left-6">
          <span className="px-4 py-2 rounded-full text-body-sm font-600 backdrop-blur-xl border bg-sage/90 text-white border-sage/50" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            Verified
          </span>
        </div>
      )}

      {/* Rating Badge - matching BusinessCard style */}
      <div className="absolute top-6 right-6 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border border-white/40">
        <Star className="w-3.5 h-3.5 text-coral fill-coral" aria-hidden />
        <span className="text-body-sm font-semibold text-charcoal" style={{ 
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', 
          fontWeight: 600
        }}>
          {Number(rating).toFixed(1)}
        </span>
      </div>

      {/* Like Button */}
      <button
        onClick={onLike}
        className={`absolute bottom-6 right-6 w-12 h-12 rounded-full backdrop-blur-xl border transition-all duration-300 hover:scale-110 ${
          isLiked
            ? "bg-coral/90 text-white border-coral/50"
            : "bg-white/20 text-navbar-bg border-white/30 hover:bg-white/30"
        }`}
        aria-label="Like business"
      >
        <Heart className={`mx-auto ${isLiked ? "fill-current text-white" : "text-navbar-bg"}`} size={20} />
      </button>
    </motion.div>
  );
}

