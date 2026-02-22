"use client";

import React from 'react';
import { m, AnimatePresence } from 'framer-motion';

interface LiveIndicatorProps {
  isLive: boolean;
  className?: string;
}

export function LiveIndicator({ isLive, className = '' }: LiveIndicatorProps) {
  if (!isLive) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-sage/10 border border-sage/20 ${className}`}
      >
        <m.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-1.5 h-1.5 bg-sage rounded-full"
        />
        <span className="text-xs font-medium text-sage">Live</span>
      </m.div>
    </AnimatePresence>
  );
}

interface BadgeNotificationProps {
  badge: {
    name: string;
    description?: string;
    icon?: string;
  };
  onClose: () => void;
}

export function BadgeNotification({ badge, onClose }: BadgeNotificationProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full mx-4"
    >
      <div className="bg-gradient-to-br from-sage/95 to-sage backdrop-blur-xl border border-white/60 rounded-[12px] shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {badge.icon ? (
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                {badge.icon}
              </div>
            ) : (
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-base mb-1">
              🎉 Badge Earned!
            </h3>
            <p className="font-medium text-white/95 text-sm mb-0.5">
              {badge.name}
            </p>
            {badge.description && (
              <p className="text-white/80 text-xs">
                {badge.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
            aria-label="Close notification"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </m.div>
  );
}

interface ReconnectingIndicatorProps {
  isReconnecting: boolean;
}

export function ReconnectingIndicator({ isReconnecting }: ReconnectingIndicatorProps) {
  if (!isReconnecting) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40"
    >
      <div className="bg-charcoal/90 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <m.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </m.div>
        <span>Reconnecting...</span>
      </div>
    </m.div>
  );
}
