"use client";

import { m, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X } from 'lucide-react';
import { Badge } from './BadgeCard';

interface BadgeModalProps {
  badge: Badge | null;
  onClose: () => void;
}

export default function BadgeModal({ badge, onClose }: BadgeModalProps) {
  if (!badge) return null;

  const isLocked = !badge.earned;

  return (
    <AnimatePresence>
      <m.div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" />

        {/* Modal Content */}
        <m.div
          className="relative bg-off-white rounded-[28px] p-6 max-w-md w-full shadow-2xl"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-charcoal/10 hover:bg-charcoal/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-charcoal" />
          </button>

          {/* Badge Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32">
              <Image
                src={badge.icon_path}
                alt={badge.name}
                fill
                className={`
                  object-contain
                  ${isLocked ? 'grayscale opacity-40' : 'filter-none'}
                `}
                unoptimized
              />

              {/* Lock overlay for locked badges */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-charcoal/60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Badge Details */}
          <div className="text-center mb-4">
            <h2 className="font-urbanist font-800 text-2xl text-charcoal mb-2">
              {badge.name}
            </h2>

            <p className="font-urbanist text-base text-charcoal/70 mb-4">
              {badge.description}
            </p>

            {/* Badge Group Tag */}
            <span className={`
              inline-block px-4 py-1 rounded-full text-xs font-700 uppercase
              ${badge.badge_group === 'explorer' ? 'bg-blue-100 text-blue-700' : ''}
              ${badge.badge_group === 'specialist' ? 'bg-purple-100 text-purple-700' : ''}
              ${badge.badge_group === 'milestone' ? 'bg-coral-100 text-coral-700' : ''}
              ${badge.badge_group === 'community' ? 'bg-card-bg-100 text-sage-700' : ''}
            `}>
              {badge.badge_group}
            </span>
          </div>

          {/* Status */}
          {isLocked ? (
            <div className="text-center p-4 bg-charcoal/5 rounded-xl">
              <p className="font-urbanist text-sm text-charcoal/60">
                🔒 Keep exploring to unlock this badge!
              </p>
            </div>
          ) : (
            <div className="text-center p-4 bg-gradient-to-br from-sage/10 to-coral/10 rounded-xl">
              <p className="font-urbanist text-sm font-700 text-sage mb-1">
                ✨ Badge Earned!
              </p>
              {badge.awarded_at && (
                <p className="font-urbanist text-xs text-charcoal/60">
                  {new Date(badge.awarded_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>
          )}
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
