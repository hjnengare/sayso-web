'use client';

import React from 'react';
import { AlertCircle, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import ReviewCard from './ReviewCard';
import type { ReviewWithUser } from '../../lib/types/database';
import { useRealtimeReviews, useRealtimeHelpfulVotes } from '../../hooks/useRealtime';
import { LiveIndicator } from '../Realtime/RealtimeIndicators';

interface ReviewsListProps {
  reviews: ReviewWithUser[];
  loading?: boolean;
  error?: string | null;
  showBusinessInfo?: boolean;
  onUpdate?: () => void;
  emptyMessage?: string;
  emptyStateAction?: {
    label: string;
    href: string;
    disabled?: boolean;
  };
  isOwnerView?: boolean; // If true, pass to ReviewCard for owner-specific actions
  businessId?: string; // For realtime subscriptions
}

export default function ReviewsList({
  reviews: initialReviews,
  loading = false,
  error = null,
  showBusinessInfo = false,
  onUpdate,
  emptyMessage = "No reviews yet. Be the first to share your experience!",
  emptyStateAction,
  isOwnerView = false,
  businessId,
}: ReviewsListProps) {
  // Use realtime reviews if businessId is provided, otherwise use initial reviews
  const { reviews: realtimeReviews, isLive } = useRealtimeReviews(businessId, initialReviews);
  const reviews = businessId ? realtimeReviews : initialReviews;
  
  // Subscribe to helpful votes for all visible reviews
  const reviewIds = reviews.map(r => r.id);
  const { helpfulCounts } = useRealtimeHelpfulVotes(businessId, reviewIds);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm rounded-lg p-2 border border-sage/5"
          >
            <div className="flex items-start space-x-4 animate-pulse">
              <div className="w-12 h-12 bg-card-bg/20 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-5 bg-card-bg/20 rounded w-24" />
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="w-4 h-4 bg-card-bg/20 rounded" />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-card-bg/20 rounded w-full" />
                  <div className="h-4 bg-card-bg/20 rounded w-3/4" />
                  <div className="h-4 bg-card-bg/20 rounded w-1/2" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <h3 className="font-urbanist text-lg font-600 text-red-800 mb-2">
            Unable to load reviews
          </h3>
          <p className="font-urbanist text-sm text-red-600">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div
        className="mx-auto w-full max-w-[2000px] px-2 font-urbanist flex flex-1 items-center justify-center"
        style={{
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        <div className="text-center w-full max-w-md">
          <div className="w-20 h-20 mx-auto mb-3 bg-off-white/80 rounded-full flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-charcoal/90" />
          </div>
          <h3 
            className="text-h2 font-semibold text-charcoal mb-2"
            style={{
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            }}
          >
            No reviews yet
          </h3>
          <p 
            className="text-body-sm text-charcoal/60 mb-6 font-medium"
            style={{
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            }}
          >
            {emptyMessage}
          </p>
          {emptyStateAction && (
            <Link
              href={emptyStateAction.href}
              className={`inline-block px-6 py-3 rounded-full text-body font-semibold transition-colors mb-6 ${
                emptyStateAction.disabled
                  ? 'bg-charcoal/20 text-charcoal/70 cursor-not-allowed'
                  : 'bg-coral text-white hover:bg-coral/90'
              }`}
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              onClick={(e) => {
                if (emptyStateAction.disabled) {
                  e.preventDefault();
                }
              }}
              aria-disabled={emptyStateAction.disabled}
            >
              {emptyStateAction.label}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
  
      {reviews.map((review) => (
        <div key={review.id}>
          <ReviewCard
            review={review}
            onUpdate={onUpdate}
            showBusinessInfo={showBusinessInfo}
            isOwnerView={isOwnerView}
            realtimeHelpfulCount={helpfulCounts[review.id]}
          />
        </div>
      ))}

      {reviews.length > 0 && (
        <div className="text-center pt-4">
          <p className="font-urbanist text-sm text-charcoal/60">
            Showing {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
