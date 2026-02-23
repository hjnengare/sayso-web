'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Edit, Trash2, ThumbsUp, ArrowRight } from 'lucide-react';
import { Text } from '@/components/atoms/Text';
import { Badge } from '@/components/atoms/Badge';
import { getCategoryPlaceholder } from '@/app/utils/categoryToPngMapping';

export interface ReviewItemProps {
  businessName: string;
  businessImageUrl?: string | null;
  businessCategory?: string | null;
  rating: number;
  reviewText?: string | null;
  reviewTitle?: string | null;
  helpfulCount?: number;
  tags?: string[];
  isFeatured?: boolean;
  createdAt: string;
  businessId?: string;
  onViewClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

const BusinessThumb: React.FC<{
  name: string;
  imageUrl?: string | null;
  category?: string | null;
  size?: number;
}> = ({ name, imageUrl, category, size = 48 }) => {
  const [err, setErr] = useState(false);

  const placeholderSrc = getCategoryPlaceholder(category ?? null);
  const src = (!imageUrl || err) ? placeholderSrc : imageUrl;

  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded-[12px] bg-off-white shadow-sm ring-1 ring-charcoal/[0.06]"
      style={{ width: size, height: size }}
      aria-label={`${name} thumbnail`}
    >
      <Image
        src={src}
        alt={`${name} thumbnail`}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        onError={() => setErr(true)}
        priority={false}
      />
    </div>
  );
};

const STAR_GRAD_ID = 'reviewItemStarGold';

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex items-center gap-1">
      {/* Gradient definition — same gold pattern as BusinessCard star badge */}
      <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }} aria-hidden>
        <defs>
          <linearGradient id={STAR_GRAD_ID} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#F5D547', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#E6A547', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>
      {Array.from({ length: 5 }, (_, i) => {
        const active = i < rating;
        return (
          <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <polygon
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              fill={active ? `url(#${STAR_GRAD_ID})` : 'none'}
              stroke={active ? `url(#${STAR_GRAD_ID})` : '#D1D5DB'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>
  );
};

export const ReviewItem: React.FC<ReviewItemProps> = ({
  businessName,
  businessImageUrl,
  businessCategory,
  rating,
  reviewText,
  reviewTitle,
  helpfulCount,
  tags = [],
  isFeatured = false,
  createdAt,
  businessId,
  onViewClick,
  onEdit,
  onDelete,
  className = '',
}) => {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const truncateText = (text: string, maxLength: number = 120) =>
    text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

  // If we have a businessId, generate the business link
  const businessLink = businessId ? `/business/${businessId}` : '#';
  const BusinessNameComponent = businessId ? Link : 'span';

  return (
    <div
      className={`flex flex-col gap-3 py-4 border-b border-sage/10 last:border-b-0 ${className}`}
    >
      {/* Header: Business info, rating, date */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <BusinessThumb name={businessName} imageUrl={businessImageUrl} category={businessCategory} size={48} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <BusinessNameComponent 
                href={businessLink}
                className={`text-lg font-semibold text-charcoal ${businessId ? 'hover:text-coral transition-colors cursor-pointer' : ''} truncate`}
                style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {businessName}
              </BusinessNameComponent>
              {isFeatured && (
                <Badge variant="coral" size="sm">
                  Featured
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <StarRating rating={rating} />
                <span className="text-sm font-medium text-charcoal ml-1">({rating})</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1.5">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="flex items-center justify-center rounded-full bg-off-white/70 hover:bg-off-white hover:scale-[1.03] transition-all min-h-[32px] min-w-[32px] p-1.5 shadow-sm"
                  aria-label="Edit review"
                  title="Edit review"
                >
                  <Edit size={14} className="text-charcoal/85" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="flex items-center justify-center rounded-full bg-off-white/70 hover:bg-off-white hover:scale-[1.03] transition-all min-h-[32px] min-w-[32px] p-1.5 shadow-sm"
                  aria-label="Delete review"
                  title="Delete review"
                >
                  <Trash2 size={14} className="text-charcoal/85" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review content */}
      {(reviewTitle || reviewText) && (
        <div className="pl-[60px]"> {/* Align with content below business thumb */}
          {reviewTitle && (
            <h4 className="text-base font-semibold text-charcoal mb-1" style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              {reviewTitle}
            </h4>
          )}
          {reviewText && (
            <p className="text-sm text-charcoal/80 leading-relaxed mb-2" style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              {truncateText(reviewText)}
            </p>
          )}
          
          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 4).map((tag, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-card-bg/15 text-sage text-xs rounded-full border border-sage/20"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 4 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{tags.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* View full review CTA */}
      {onViewClick && (
        <div className="pl-[60px]">
          <button
            type="button"
            onClick={onViewClick}
            className="group inline-flex items-center gap-1 text-coral hover:text-coral/80 transition-colors duration-200 text-sm font-medium"
            aria-label={`Read full review for ${businessName}`}
          >
            <span className="group-hover:underline underline-offset-2 decoration-coral/50 transition-all duration-200">
              Read full review
            </span>
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
        </div>
      )}
    </div>
  );
};
