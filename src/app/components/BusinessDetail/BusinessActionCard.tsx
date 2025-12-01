// src/components/BusinessDetail/BusinessActionCard.tsx
"use client";

import { motion } from "framer-motion";
import { Facebook, Instagram, Twitter } from "react-feather";
import Link from "next/link";

interface BusinessActionCardProps {
  businessSlug: string;
  businessId: string;
  isBusinessOwner?: boolean;
  hasReviewed?: boolean;
}

export default function BusinessActionCard({ businessSlug, businessId, isBusinessOwner = false, hasReviewed = false }: BusinessActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] ring-1 ring-white/30 p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Gradient overlays matching user profile */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>
      
      <div className="relative z-10">
        <h3
          className="text-h3 font-semibold text-charcoal mb-3"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          Take Action
        </h3>

        <div className="space-y-3">
          <Link
            href={hasReviewed ? '#' : `/business/${businessSlug}/review`}
            className={`block w-full font-semibold py-3 px-5 rounded-full transition-all duration-300 border text-body-sm text-center ${
              hasReviewed
                ? 'bg-charcoal/20 text-charcoal/50 cursor-not-allowed border-charcoal/20'
                : 'bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white hover:bg-navbar-bg border-white/30'
            }`}
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            onClick={(e) => {
              if (hasReviewed) {
                e.preventDefault();
              }
            }}
            aria-disabled={hasReviewed}
            title={hasReviewed ? 'You have already reviewed this business' : 'Leave a Review'}
          >
            {hasReviewed ? 'Already Reviewed' : 'Leave a Review'}
          </Link>

          {isBusinessOwner && (
            <Link
              href={`/business/${businessSlug}/edit`}
              className="block w-full bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-sm text-charcoal font-semibold py-3 px-5 rounded-full transition-all duration-300 hover:bg-charcoal hover:text-white border border-white/40 text-body-sm text-center"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Edit Business
            </Link>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-charcoal/10">
          <h4
            className="text-body-sm font-semibold text-charcoal/80 mb-2.5"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            Share Business
          </h4>
        <div className="flex gap-2">
          <button className="flex-1 bg-white/30 hover:bg-navbar-bg text-navbar-bg hover:text-white py-2 px-3 rounded-full transition-all duration-200">
            <Facebook size={16} className="mx-auto" />
          </button>
          <button className="flex-1 bg-white/30 hover:bg-navbar-bg text-navbar-bg hover:text-white py-2 px-3 rounded-full transition-all duration-200">
            <Instagram size={16} className="mx-auto" />
          </button>
          <button className="flex-1 bg-white/30 hover:bg-navbar-bg text-navbar-bg hover:text-white py-2 px-3 rounded-full transition-all duration-200">
            <Twitter size={16} className="mx-auto" />
          </button>
        </div>
      </div>
      </div>
    </motion.div>
  );
}

