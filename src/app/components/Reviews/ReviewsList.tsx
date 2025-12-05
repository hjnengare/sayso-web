'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, MessageCircle } from 'lucide-react';
import ReviewCard from './ReviewCard';
import type { ReviewWithUser } from '../../lib/types/database';

interface ReviewsListProps {
  reviews: ReviewWithUser[];
  loading?: boolean;
  error?: string | null;
  showBusinessInfo?: boolean;
  onUpdate?: () => void;
  emptyMessage?: string;
}

export default function ReviewsList({
  reviews,
  loading = false,
  error = null,
  showBusinessInfo = false,
  onUpdate,
  emptyMessage = "No reviews yet. Be the first to share your experience!"
}: ReviewsListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm rounded-lg p-6 border border-sage/5"
          >
            <div className="flex items-start space-x-4 animate-pulse">
              <div className="w-12 h-12 bg-sage/20 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-5 bg-sage/20 rounded w-24" />
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="w-4 h-4 bg-sage/20 rounded" />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-sage/20 rounded w-full" />
                  <div className="h-4 bg-sage/20 rounded w-3/4" />
                  <div className="h-4 bg-sage/20 rounded w-1/2" />
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
      >
        <div className="flex items-center justify-center mb-3">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <h3 className="font-urbanist text-lg font-600 text-red-800 mb-2">
          Unable to load reviews
        </h3>
        <p className="font-urbanist text-sm text-red-600">
          {error}
        </p>
      </motion.div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div
        className="mx-auto w-full max-w-[2000px] px-2 font-urbanist w-full"
        style={{
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        <div className="text-center w-full">
          <div className="w-20 h-20 mx-auto mb-6 bg-sage/10 rounded-full flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-sage" />
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
            className="text-body-sm text-charcoal/60 mb-6 max-w-md mx-auto"
            style={{
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              fontWeight: 500,
            }}
          >
            {emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review, index) => (
        <motion.div
          key={review.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
        >
          <ReviewCard
            review={review}
            onUpdate={onUpdate}
            showBusinessInfo={showBusinessInfo}
          />
        </motion.div>
      ))}

      {reviews.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reviews.length * 0.1 + 0.2 }}
          className="text-center pt-4"
        >
          <p className="font-urbanist text-sm text-charcoal/60">
            Showing {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </p>
        </motion.div>
      )}
    </div>
  );
}
