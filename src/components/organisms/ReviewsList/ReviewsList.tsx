'use client';

import React, { useState } from 'react';
import { ReviewItem, ReviewItemProps } from '@/components/molecules/ReviewItem';
import { ChevronUp, ChevronRight } from 'lucide-react';
import { Text } from '@/components/atoms/Text';

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
    <div className={`p-6 sm:p-8 bg-card-bg border border-white/50 rounded-[20px] shadow-sm mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <Text variant="h5" className="mb-0">{title}</Text>
        {showToggle && reviews.length > initialDisplayCount && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center space-x-1"
            aria-expanded={showAll}
          >
            <Text variant="body-sm" color="coral" as="span">{showAll ? 'Hide' : 'See all'}</Text>
            {showAll ? (
              <ChevronUp size={16} className="text-coral" />
            ) : (
              <ChevronRight size={16} className="text-coral" />
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
