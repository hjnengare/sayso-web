"use client";

import { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import Image from "next/image";

export interface ToastNotificationData {
  id: string;
  type: "review" | "business" | "user" | "highlyRated" | "badge_earned" | "review_helpful" | "business_approved" | "claim_approved" | "comment_reply" | "gamification" | "milestone_achievement" | "message" | "otp_sent" | "otp_verified" | "claim_status_changed" | "docs_requested" | "docs_received" | "photo_approved";
  message: string;
  title: string;
  timeAgo: string;
  image: string;
  imageAlt: string;
  link?: string;
}

interface ToastNotificationProps {
  notification: ToastNotificationData;
  onClose: () => void;
  duration?: number;
}

export default function ToastNotification({
  notification,
  onClose,
  duration = 5000,
}: ToastNotificationProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onClose]);

  // Special styling for highly rated notifications
  const isHighlyRated = notification.type === "highlyRated";
  const borderClass = isHighlyRated 
    ? "border-coral/60 ring-coral/30" 
    : "border-white/50 ring-white/20";
  const progressBarBg = isHighlyRated ? "bg-coral/10" : "bg-card-bg/10";
  const progressBarGradient = isHighlyRated 
    ? "from-coral to-coral/90" 
    : "from-sage to-sage/90";

  return (
    <m.div
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`notification-toast relative bg-page-bg backdrop-blur-md border rounded-[12px] ring-1 shadow-lg overflow-hidden w-80 max-w-[calc(100vw-2rem)] ${borderClass}`}
    >
      {/* Progress bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${progressBarBg}`}>
        <m.div
          className={`h-full bg-gradient-to-r ${progressBarGradient}`}
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>

      <div className="flex items-start gap-3 p-4 pt-5 pl-14">
        {/* Close button */}
        <button
          onClick={onClose}
          className="toast-close-btn absolute top-2 left-2 w-7 h-7 flex items-center justify-center rounded-full bg-gradient-to-br from-charcoal to-charcoal/90 text-white hover:scale-110 transition-all duration-200 border border-white/30 shadow-sm z-10"
          aria-label="Close notification"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Image banner */}
        {notification.image && notification.image.trim() !== "" ? (
          <div className="toast-banner flex-shrink-0 relative w-20 h-20 rounded-lg overflow-hidden bg-white/20 border border-white/50">
            <Image
              src={notification.image}
              alt={notification.imageAlt || ""}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="toast-banner flex-shrink-0 relative w-20 h-20 rounded-lg overflow-hidden bg-white/20 border border-white/50 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-charcoal/60"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        )}

        {/* Details */}
        <div className="toast-detail flex-1 min-w-0">
          <p className="toast-message font-urbanist text-sm sm:text-xs font-600 text-charcoal/70 mb-1">
            {notification.message}
          </p>

          <p className="toast-title font-urbanist text-sm font-600 text-charcoal line-clamp-2 mb-1">
            {notification.title}
          </p>

          <p className="toast-meta font-urbanist text-sm sm:text-xs text-charcoal/60">
            <time>{notification.timeAgo}</time> ago
          </p>
        </div>
      </div>
    </m.div>
  );
}
