import React from "react";

interface BusinessCardReviewsProps {
  hasRating: boolean;
  displayRating?: number;
  reviews: number;
  hasReviewed: boolean;
  onCardClick: (e: React.MouseEvent | React.KeyboardEvent) => void;
  onWriteReview: (e: React.MouseEvent | React.KeyboardEvent) => void;
  compact?: boolean;
}

const BusinessCardReviews: React.FC<BusinessCardReviewsProps> = ({
  hasRating,
  displayRating,
  reviews,
  hasReviewed,
  onCardClick,
  onWriteReview,
  compact = false,
}) => (
  <div className="flex flex-col items-center gap-2 mb-2">
    <div className="inline-flex items-center justify-center gap-1 min-h-[20px]">
      {hasRating && displayRating !== undefined ? (
        <>
          <span
            role="link"
            tabIndex={0}
            onClick={onCardClick}
            onKeyDown={onCardClick}
            className="inline-flex items-center justify-center text-body-sm sm:text-base font-bold leading-none text-navbar-bg underline-offset-2 cursor-pointer transition-colors duration-200 hover:text-coral"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 700 }}
          >
            {reviews}
          </span>
          <span
            role="link"
            tabIndex={0}
            onClick={onCardClick}
            onKeyDown={onCardClick}
            className="inline-flex items-center justify-center text-sm leading-none text-navbar-bg underline-offset-2 cursor-pointer transition-colors duration-200 hover:text-coral"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}
          >
            Reviews
          </span>
        </>
      ) : (
        <span
          role="button"
          tabIndex={hasReviewed ? -1 : 0}
          onClick={onWriteReview}
          onKeyDown={onWriteReview}
          className={`inline-flex items-center justify-center text-sm font-normal underline-offset-2 min-w-[92px] text-center transition-colors duration-200 ${hasReviewed ? 'text-charcoal/70 cursor-not-allowed' : 'text-charcoal cursor-pointer hover:text-coral'} ${compact ? 'lg:order-1 lg:mb-1' : ''}`}
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 400 }}
          aria-disabled={hasReviewed}
          title={hasReviewed ? 'You have already reviewed this business' : 'Be the first to review'}
        >
          {hasReviewed ? 'Already reviewed' : 'Be the first to review'}
        </span>
      )}
    </div>
  </div>
);

export default BusinessCardReviews;
