"use client";

import Image from "next/image";
import { Star, Heart, MapPin, Calendar, User, MessageSquare } from "lucide-react";

interface SmallReview {
  id: string;
  user: { name: string; avatar?: string; location?: string };
  business: string;
  rating: number;
  text: string;
  date: string;
  likes: number;
  image?: string;
}

interface ReviewSidebarProps {
  otherReviews: SmallReview[];
  businessInfo?: {
    name: string;
    phone?: string;
    website?: string;
    address?: string;
    email?: string;
    category?: string;
    location?: string;
  };
  businessRating?: number;
  loading?: boolean;
}

const frostyPanel = `
  relative overflow-hidden rounded-[12px]
  bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md
  border border-white/50 ring-1 ring-white/20
  shadow-lg shadow-sage/20
`.replace(/\s+/g, " ");

const placeholderCards = Array.from({ length: 3 });

export default function ReviewSidebar({
  otherReviews,
  businessInfo,
  businessRating,
  loading = false,
}: ReviewSidebarProps) {
  const hasReviews = otherReviews.length > 0;
  const showFallback = !loading && !hasReviews;

  const renderReviewCard = (
    review: SmallReview | null,
    variant: "desktop" | "mobile",
    index: number,
    keyBase: string
  ) => {
    const isSkeleton = !review;
    const containerClasses =
      variant === "desktop"
        ? "rounded-[12px] border border-sage/10 bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-md px-3 py-6 relative overflow-hidden border border-white/30"
        : "min-w-[240px] sm:min-w-[260px] max-w-[260px] sm:max-w-[280px] bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-md border border-sage/10 rounded-[12px] p-3 sm:p-4 relative overflow-hidden";
    const avatarClasses =
      variant === "desktop"
        ? "relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-sage/10"
        : "relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0 bg-sage/10";
    const textLineClass = "h-3 rounded-full bg-charcoal/10";

    return (
      <div key={`${keyBase}-${review?.id ?? `placeholder-${index}`}`} className={containerClasses}>
        <span className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-sage/10 blur-lg" />
        <span className="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-coral/10 blur-lg" />
        <div className="flex gap-3 relative z-10">
          <div className={avatarClasses}>
            {isSkeleton ? (
              <div className="absolute inset-0 bg-charcoal/10 animate-pulse" />
            ) : review?.user.avatar ? (
              <Image
                src={review.user.avatar}
                alt={`${review.user.name} avatar`}
                fill
                className="object-cover"
                sizes={variant === "desktop" ? "40px" : "(max-width: 640px) 32px, 40px"}
                quality={85}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sage">
                <User className="w-4 h-4 text-sage/70" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between mb-1">
              {isSkeleton ? (
                <div className="w-24 h-3 rounded-full bg-charcoal/10 animate-pulse" />
              ) : (
                <p
                  className="text-sm font-semibold text-charcoal font-urbanist truncate"
                  style={{
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  }}
                >
                  {review?.user.name}
                </p>
              )}
              <div className="flex items-center gap-1">
                <Star
                  size={variant === "desktop" ? 14 : 12}
                  className="text-coral"
                  style={{ fill: "currentColor" }}
                />
                {isSkeleton ? (
                  <div className="w-6 h-3 rounded-full bg-charcoal/10 animate-pulse" />
                ) : (
                  <span
                    className="text-[12px] text-charcoal/60 font-urbanist"
                    style={{
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                    }}
                  >
                    {review?.rating}
                  </span>
                )}
              </div>
            </div>
            <div
              className="flex items-center gap-2 text-[12px] text-charcoal/60 mb-1 font-urbanist"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
            >
              {isSkeleton ? (
                <>
                  <div className="w-16 h-2 rounded-full bg-charcoal/10 animate-pulse" />
                  <div className="w-16 h-2 rounded-full bg-charcoal/10 animate-pulse" />
                </>
              ) : (
                <>
                  {review?.user.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} />
                      {review.user.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} />
                    {review?.date}
                  </span>
                </>
              )}
            </div>
            {isSkeleton ? (
              <div className="space-y-2">
                <div className={`${textLineClass} animate-pulse`} />
                <div className={`${textLineClass} animate-pulse`} />
                <div className={`w-3/4 ${textLineClass} animate-pulse`} />
              </div>
            ) : (
              <>
                <p
                  className="text-sm sm:text-[0.92rem] text-charcoal/90 leading-relaxed mb-2 font-urbanist"
                  style={{
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  }}
                >
                  {review?.text}
                </p>
                {review?.image && (
                  <div className="relative mt-2 w-full h-20 rounded-md overflow-hidden">
                    <Image
                      src={review.image}
                      alt={`${review.business} photo`}
                      fill
                      className="object-cover"
                      sizes="320px"
                      quality={85}
                    />
                  </div>
                )}
              </>
            )}
            <div className="flex items-center gap-1 text-charcoal/60 mt-2">
              <Heart size={12} />
              {isSkeleton ? (
                <div className="w-8 h-2 rounded-full bg-charcoal/10 animate-pulse" />
              ) : (
                <span
                  className="text-[10px] font-urbanist"
                  style={{
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  }}
                >
                  {review?.likes}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDesktopContent = () => {
    if (loading) {
      return placeholderCards.map((_, idx) => renderReviewCard(null, "desktop", idx, "desktop-skeleton"));
    }

    if (showFallback) {
      return (
        <div className="rounded-[12px] border border-sage/10 bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-md px-4 py-8 relative overflow-hidden border border-white/30">
          <span className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-sage/10 blur-lg" />
          <span className="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-coral/10 blur-lg" />
          <div className="flex flex-col items-center justify-center text-center relative z-10 space-y-3">
            <div className="w-12 h-12 rounded-full bg-sage/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-sage/60" />
            </div>
            <div>
              <p className="text-sm font-600 text-charcoal/80 font-urbanist mb-1">No reviews yet</p>
              <p className="text-sm sm:text-xs text-charcoal/60 font-urbanist leading-relaxed">
                Other community reviews will appear here once they're submitted
              </p>
            </div>
          </div>
        </div>
      );
    }

    return otherReviews.map((r, idx) => renderReviewCard(r, "desktop", idx, "desktop"));
  };

  const renderMobileContent = () => {
    if (loading) {
      return (
        <div className="flex gap-2 sm:gap-3 px-4 pb-4">
          {placeholderCards.map((_, idx) => renderReviewCard(null, "mobile", idx, "mobile-skeleton"))}
        </div>
      );
    }

    if (showFallback) {
      return (
        <div className="mx-4 rounded-[12px] border border-sage/10 bg-gradient-to-br from-white/85 to-white/60 backdrop-blur-md px-4 py-8 relative overflow-hidden">
          <span className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-sage/10 blur-lg" />
          <span className="pointer-events-none absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-coral/10 blur-lg" />
          <div className="flex flex-col items-center justify-center text-center relative z-10 space-y-3">
            <div className="w-12 h-12 rounded-full bg-sage/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-sage/60" />
            </div>
            <div>
              <p className="text-sm font-600 text-charcoal/80 font-urbanist mb-1">No reviews yet</p>
              <p className="text-sm sm:text-xs text-charcoal/60 font-urbanist leading-relaxed">
                Other community reviews will appear here once they're submitted
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <ul className="flex gap-2 sm:gap-3 px-4 pb-4">
        {otherReviews.map((r, idx) => (
          <li key={`mobile-${r.id}-${idx}`}>{renderReviewCard(r, "mobile", idx, "mobile")}</li>
        ))}
      </ul>
    );
  };

  return (
    <>
      {/* Desktop: Aligned with form */}
      <div className="hidden lg:block">
        <div className={frostyPanel}>
          <div className="relative z-[1]">
            <h3
              className="text-sm font-bold text-charcoal font-urbanist px-3 pt-4 pb-3 border-b border-white/30"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
              }}
            >
              What others are saying
            </h3>
            {businessInfo && (
              <div className="px-3 py-3 border-b border-white/30">
                <div className="flex items-center justify-center space-x-2">
                  <div className="flex items-center space-x-1 bg-gradient-to-br from-amber-400 to-amber-600 px-3 py-1.5 rounded-full">
                    <Star size={16} className="text-white" style={{ fill: "currentColor" }} />
                    <span className="text-sm font-600 text-white">
                      {businessRating?.toFixed(1) || "0.0"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="px-3 py-4 space-y-2 xl:space-y-3 max-h-[600px] overflow-y-auto custom-scroll">
              {renderDesktopContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet horizontal list */}
      <div className="lg:hidden mt-4 sm:mt-6">
        <h3
          className="text-sm font-bold text-charcoal font-urbanist px-4 pt-4 pb-3"
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
          }}
        >
          What others are saying
        </h3>
        <div className="mt-2 sm:mt-3 overflow-x-auto hide-scrollbar">{renderMobileContent()}</div>
      </div>
    </>
  );
}
