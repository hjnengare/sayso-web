"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "react-feather";
import Image from "next/image";
import { getCategoryPng, isPngIcon } from "../../utils/categoryToPngMapping";
import OptimizedImage from "../Performance/OptimizedImage";

interface SimilarBusinessCardProps {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  image_url?: string;
  uploaded_images?: string[];
  category: string;
  location: string;
  address?: string;
  description?: string;
  rating?: number;
  totalRating?: number;
  reviews?: number;
  total_reviews?: number;
  verified?: boolean;
  priceRange?: string;
  price_range?: string;
  compact?: boolean;
}

export default function SimilarBusinessCard({
  id,
  slug,
  name,
  image,
  image_url,
  uploaded_images,
  category,
  location,
  address,
  description,
  rating,
  totalRating,
  reviews,
  total_reviews,
  verified,
  priceRange,
  price_range,
  compact = false,
}: SimilarBusinessCardProps) {
  const router = useRouter();
  
  // Determine display image - use first image from uploaded_images array if available
  const displayImage = (uploaded_images && uploaded_images.length > 0 ? uploaded_images[0] : null) || image_url || image || getCategoryPng(category);
  const isImagePng = displayImage ? (isPngIcon(displayImage) || displayImage.includes('/png/') || displayImage.endsWith('.png')) : false;

  // Use slug for SEO-friendly URLs, fallback to ID
  const businessIdentifier = slug || id;

  const handleCardClick = () => {
    router.push(`/business/${businessIdentifier}`);
  };

  return (
    <div
      className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden group cursor-pointer w-full flex flex-col border border-white/60 backdrop-blur-xl shadow-md transition-all duration-300 hover:border-white/80 hover:-translate-y-1 hover:shadow-lg md:w-[340px] md:h-[416px]"
      style={{
        maxWidth: "540px",
      } as React.CSSProperties}
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Image Section */}
      <div className="relative w-full h-[300px] lg:h-[260px] overflow-hidden rounded-t-[20px]">
        {isImagePng ? (
          <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85">
            <OptimizedImage
              src={displayImage}
              alt={name}
              width={320}
              height={350}
              sizes="(max-width: 768px) 540px, 340px"
              className="w-32 h-32 md:w-36 md:h-36 object-contain"
              priority={false}
              quality={90}
            />
          </div>
        ) : (
          <div className="relative w-full h-full overflow-hidden bg-card-bg">
            {/* Blurred background - Instagram style */}
            <div className="absolute inset-0">
              <Image
                src={displayImage}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 540px, 340px"
                priority={false}
                quality={50}
                loading="lazy"
                style={{
                  filter: 'blur(40px)',
                  opacity: 0.6,
                  transform: 'scale(1.2)',
                }}
                aria-hidden="true"
              />
            </div>

            {/* Foreground image - sharp, centered, aspect-ratio preserved */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src={displayImage}
                alt={name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 540px, 340px"
                priority={false}
                quality={90}
                loading="lazy"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="px-4 py-4 bg-gradient-to-b from-card-bg/95 to-card-bg flex flex-col gap-2 rounded-b-[20px]">
        {/* Name */}
        <h3
          className="text-base sm:text-lg font-bold text-charcoal leading-tight line-clamp-1 transition-colors duration-300 group-hover:text-navbar-bg/90"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            fontWeight: 700,
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility',
          }}
          title={name}
        >
          {name}
        </h3>

        {/* Description */}
        {description && (
          <p
            className="text-sm text-charcoal/70 line-clamp-2 leading-snug"
            style={{
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              fontWeight: 400,
            }}
          >
            {description}
          </p>
        )}

        {/* Location */}
        {(location || address) && (
          <div className="flex items-center gap-1.5 text-xs text-charcoal/60 mt-1">
            <div className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center">
              <OptimizedImage
                src={getCategoryPng(category)}
                alt={category}
                width={14}
                height={14}
                className="w-3.5 h-3.5 object-contain opacity-60"
                priority={false}
                quality={90}
              />
            </div>
            <span className="truncate">{location || address}</span>
          </div>
        )}

        {/* Go to Business Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white rounded-full text-sm font-semibold hover:from-navbar-bg/90 hover:to-navbar-bg/80 active:scale-95 transition-all duration-200 shadow-md border border-sage/50 focus:outline-none focus:ring-2 focus:ring-sage/40"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            fontWeight: 600,
          }}
        >
          <span>Go to business</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
