"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PremiumReviewCard } from "./PremiumReviewCard";

      interface TestimonialCarouselProps {
        reviews: Array<{
          id?: string | number;
          userId?: string;
          author: string;
          rating: number;
          text: string;
          date: string;
          tags?: string[];
          highlight?: string;
          verified?: boolean;
          profileImage?: string;
          reviewImages?: string[];
          location?: string;
          profile?: {
            display_name?: string;
            username?: string;
            avatar_url?: string;
            location?: string;
          };
        }>;
        onDelete?: () => void;
      }

export function TestimonialCarousel({ reviews, onDelete }: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!reviews || reviews.length === 0) return null;

  const isSingleReview = reviews.length === 1;

  const handlePrev = () => {
    if (isSingleReview) return;
    setCurrentIndex((prev) =>
      prev > 0 ? prev - 1 : reviews.length - 1
    );
  };

  const handleNext = () => {
    if (isSingleReview) return;
    setCurrentIndex((prev) =>
      prev < reviews.length - 1 ? prev + 1 : 0
    );
  };

  const getPrevIndex = () =>
    (currentIndex - 1 + reviews.length) % reviews.length;

  const getNextIndex = () =>
    (currentIndex + 1) % reviews.length;

  return (
    <div className="relative w-full py-8 md:py-10 min-h-[480px] md:min-h-[520px] flex items-center justify-center" style={{ height: 'auto', minHeight: '480px' }}>
      {/* Left Arrow */}
      <button
        onClick={handlePrev}
        disabled={isSingleReview}
        className={`absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center shadow-lg ${
          isSingleReview
            ? "border-sage/30 bg-navbar-bg/90 opacity-40"
            : "border-sage bg-sage hover:bg-navbar-bg cursor-pointer"
        }`}
        style={{
          borderColor: isSingleReview
            ? "rgba(125, 155, 118, 0.3)"
            : "#7D9B76",
        }}
        aria-label="Previous testimonial"
      >
        <ChevronLeft
          className={`w-5 h-5 ${
            isSingleReview ? "text-sage/40" : "text-white"
          }`}
          strokeWidth={3}
        />
      </button>

      {/* Slider Stage */}
      <div className="relative w-full max-w-5xl flex items-center justify-center" style={{ minHeight: '100%' }}>
        {reviews.map((review, index) => {
          const profile = review.profile || {};
          const authorName =
            profile.display_name || profile.username || review.author;
          
          // All reviewers are authenticated, so we should always have a name
          if (!authorName) {
            console.warn('Review missing author name:', review);
          }

          const prevIndex = getPrevIndex();
          const nextIndex = getNextIndex();

          const isActive = index === currentIndex;
          const isPrev = index === prevIndex;
          const isNext = index === nextIndex;

          // Base positioning: center vertically & horizontally
          let positionClasses =
            "absolute top-1/2 left-1/2 -translate-y-1/2 transition-all duration-500 ease-out";

          if (isActive) {
            // Center card – big, bright, sharp (like screenshot)
            positionClasses +=
              " -translate-x-1/2 scale-100 opacity-100 z-20";
          } else if (isPrev) {
            // Left card – peeking, smaller, faded
            positionClasses +=
              " -translate-x-[150%] scale-95 opacity-60 z-10";
          } else if (isNext) {
            // Right card – peeking, smaller, faded
            positionClasses +=
              " translate-x-[50%] scale-95 opacity-60 z-10";
          } else {
            // Other cards – hidden
            positionClasses +=
              " -translate-x-1/2 scale-90 opacity-0 pointer-events-none z-0";
          }

          return (
            <div
              key={review.id || index}
              className={`${positionClasses} w-[85%] sm:w-[70%] md:w-[60%] lg:w-[55%]`}
            >
                    <PremiumReviewCard
                      reviewId={review.id as string}
                      userId={review.userId}
                      author={authorName}
                      rating={review.rating}
                      text={review.text}
                      date={review.date}
                      tags={review.tags}
                      highlight={review.highlight}
                      verified={review.verified}
                      profileImage={review.profileImage || profile.avatar_url}
                      reviewImages={review.reviewImages}
                      compact={true}
                      onDelete={onDelete}
                    />
            </div>
          );
        })}
      </div>

      {/* Right Arrow */}
      <button
        onClick={handleNext}
        disabled={isSingleReview}
        className={`absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center shadow-lg ${
          isSingleReview
            ? "border-sage/30 border-sage/30 bg-navbar-bg/90 opacity-40"
            : "border-sage bg-sage hover:bg-navbar-bg cursor-pointer"
        }`}
        style={{
          borderColor: isSingleReview
            ? "rgba(125, 155, 118, 0.3)"
            : "#7D9B76",
        }}
        aria-label="Next testimonial"
      >
        <ChevronRight
          className={`w-5 h-5 ${
            isSingleReview ? "text-sage/40" : "text-white"
          }`}
          strokeWidth={3}
        />
      </button>
    </div>
  );
}
