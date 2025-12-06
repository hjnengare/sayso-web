'use client';

import React, { useState } from 'react';
import { ReviewItem, ReviewItemProps } from '@/components/molecules/ReviewItem';
import { ChevronUp, ChevronRight } from 'react-feather';

export interface ReviewsListProps {
  reviews: ReviewItemProps[];
  title?: string;
  initialDisplayCount?: number;
  showToggle?: boolean;
  className?: string;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({
  reviews,
  title = 'Your Contributions',
  initialDisplayCount = 2,
  showToggle = true,
  className = '',
}) => {
  const [showAll, setShowAll] = useState(false);

  const displayedReviews = showAll
    ? reviews
    : reviews.slice(0, initialDisplayCount);

  return (
    <div className={`p-6 sm:p-8 bg-card-bg border border-white/50 rounded-[12px] shadow-sm mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-charcoal" style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>{title}</h2>
        {showToggle && reviews.length > initialDisplayCount && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-coral font-600 hover:text-coral/80 transition-colors duration-200 flex items-center space-x-1"
            aria-expanded={showAll}
            style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif', fontWeight: 600 }}
          >
            <span>{showAll ? 'Hide' : 'See all'}</span>
            {showAll ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      {reviews.length > 0 ? (
        <div className="space-y-3">
          {displayedReviews.map((review, index) => (
            <ReviewItem key={index} {...review} />
          ))}
        </div>
      ) : (
        <p className="text-center text-charcoal/60 py-8 text-sm" style={{ fontFamily: '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif', fontWeight: 600 }}>No reviews yet</p>
      )}
    </div>
  );
};
