// src/components/BusinessDetail/BusinessActionCard.tsx
"use client";

import { motion } from "framer-motion";
import { Facebook, Instagram, Twitter, MessageSquare } from "lucide-react";
import Link from "next/link";

interface BusinessActionCardProps {
  businessSlug: string;
  businessId: string;
  isBusinessOwner?: boolean;
  hasReviewed?: boolean;
  ownerId?: string | null;
}

export default function BusinessActionCard({ businessSlug, businessId, isBusinessOwner = false, hasReviewed = false, ownerId }: BusinessActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] ring-1 ring-white/30 shadow-md p-4 sm:p-6"
    >
        <h3
          className="text-h3 font-semibold text-charcoal mb-3"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Take Action
        </h3>

        <div className="space-y-3">
          <Link
            href={`/business/${businessSlug}/review`}
            className="block w-full font-semibold py-3 px-5 rounded-full transition-all duration-300 border text-body-sm text-center bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white hover:bg-navbar-bg border-white/30 shadow-md"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            title={'Leave a Review'}
          >
            Leave a Review
          </Link>

          {ownerId && !isBusinessOwner && (
            <Link
              href={`/dm?owner_id=${ownerId}&business_id=${businessId}`}
              className="block w-full bg-gradient-to-br from-coral to-coral/90 text-white font-semibold py-3 px-5 rounded-full transition-all duration-300 hover:bg-coral/80 border border-white/30 shadow-md text-body-sm text-center flex items-center justify-center gap-2"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              <MessageSquare size={18} strokeWidth={2.5} />
              Message Owner
            </Link>
          )}

          {isBusinessOwner && (
            <Link
              href={`/business/${businessSlug}/edit`}
              className="block w-full bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-sm text-charcoal font-semibold py-3 px-5 rounded-full transition-all duration-300 hover:bg-charcoal hover:text-white border border-white/40 shadow-md text-body-sm text-center"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Edit Business
            </Link>
          )}
        </div>
    </motion.div>
  );
}

