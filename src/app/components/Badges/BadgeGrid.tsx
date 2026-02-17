"use client";

import { useState } from 'react';
import BadgeCard, { Badge } from './BadgeCard';
import BadgeModal from './BadgeModal';

interface BadgeGridProps {
  title: React.ReactNode;
  badges: Badge[];
  emptyMessage?: string;
}

export default function BadgeGrid({ title, badges, emptyMessage = "No badges in this category" }: BadgeGridProps) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  if (!badges || badges.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="font-urbanist font-800 text-xl text-charcoal mb-4">
          {title}
        </h2>
        <p className="text-charcoal/70 text-center py-8">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="font-urbanist font-800 text-xl text-charcoal mb-4">
          {title}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {badges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              onClick={() => setSelectedBadge(badge)}
            />
          ))}
        </div>
      </div>

      {/* Badge Detail Modal */}
      <BadgeModal
        badge={selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
    </>
  );
}
