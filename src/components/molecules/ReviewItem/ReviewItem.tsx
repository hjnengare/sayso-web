'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Star, Briefcase, Edit, Trash2 } from 'lucide-react';
import { Text } from '@/components/atoms/Text';
import { Badge } from '@/components/atoms/Badge';

export interface ReviewItemProps {
  businessName: string;
  businessImageUrl?: string | null;
  rating: number;
  reviewText?: string | null;
  isFeatured?: boolean;
  createdAt: string;
  onViewClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

const BusinessThumb: React.FC<{
  name: string;
  imageUrl?: string | null;
  size?: number;
}> = ({ name, imageUrl, size = 40 }) => {
  const [err, setErr] = useState(false);

  if (!imageUrl || err) {
    return (
      <div
        className="relative rounded-full bg-gradient-to-br from-sage/15 to-coral/10 border-border-charcoal/10 flex items-center justify-center ring-2 ring-off-white shadow-sm"
        style={{ width: size, height: size }}
        aria-label={`${name} placeholder image`}
      >
        <Briefcase size={size * 0.5} className="text-white" />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-full overflow-hidden ring-2 ring-off-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <div className="w-full h-full rounded-full p-0.5 bg-off-white">
        <Image
          src={imageUrl}
          alt={`${name} thumbnail`}
          width={size}
          height={size}
          className="w-full h-full rounded-full object-cover"
          onError={() => setErr(true)}
        />
      </div>
    </div>
  );
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const active = i < rating;
        return (
          <Star
            key={i}
            size={16}
            className={`${active ? 'text-coral fill-coral' : 'text-gray-300'}`}
            aria-hidden
          />
        );
      })}
    </div>
  );
};

export const ReviewItem: React.FC<ReviewItemProps> = ({
  businessName,
  businessImageUrl,
  rating,
  isFeatured = false,
  createdAt,
  onViewClick,
  onEdit,
  onDelete,
  className = '',
}) => {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div
      className={`flex items-center justify-between py-3 border-b border-sage/10 last:border-b-0 ${className}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <BusinessThumb name={businessName} imageUrl={businessImageUrl} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Text variant="body-lg" as="span" className="truncate">{businessName}</Text>
            <StarRating rating={rating} />
            {isFeatured && (
              <Badge variant="coral" size="sm">
                Featured
              </Badge>
            )}
          </div>
          <Text variant="body-sm" color="secondary">{formatDate(createdAt)}</Text>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3">
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1.5">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex items-center justify-center rounded-full bg-navbar-bg hover:bg-navbar-bg/90 transition-colors min-h-[36px] min-w-[36px] p-2"
                aria-label="Edit review"
                title="Edit review"
              >
                <Edit size={16} className="text-white" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex items-center justify-center rounded-full bg-navbar-bg hover:bg-navbar-bg/90 transition-colors min-h-[36px] min-w-[36px] p-2"
                aria-label="Delete review"
                title="Delete review"
              >
                <Trash2 size={16} className="text-white" />
              </button>
            )}
          </div>
        )}
        {onViewClick && (
          <div className="text-right">
            <button
              onClick={onViewClick}
              className="hover:text-coral/80 transition-colors duration-200"
              aria-label="View review"
            >
              <Text variant="body-sm" color="coral">Click to see</Text>
              <Text variant="caption" color="secondary" className="block mt-1">full review</Text>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
