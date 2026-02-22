// src/components/SpecialDetail/SpecialActionCard.tsx
"use client";

import { m } from "framer-motion";
import { Star, Share2 } from "lucide-react";
import Link from "next/link";

interface SpecialActionCardProps {
    specialId?: string;
    hasReviewed?: boolean;
}

export default function SpecialActionCard({ specialId, hasReviewed = false }: SpecialActionCardProps) {
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Check out this special offer!',
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    return (
        <m.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-5 sm:p-6 sticky top-24"
        >
            <h3
                className="text-lg font-bold text-charcoal mb-4"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
                Claim This Special
            </h3>

            <div className="space-y-3">
                <button
                    className="w-full bg-gradient-to-r from-sage to-sage/90 hover:from-sage/90 hover:to-sage/80 text-white font-semibold py-3 px-5 rounded-full transition-all duration-300 hover:scale-105 border border-white/30 text-sm"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                    Visit Venue
                </button>

                {specialId && (
                    <Link
                        href={`/write-review/special/${specialId}`}
                        className="w-full inline-block text-center bg-gradient-to-r from-coral to-coral/90 hover:from-coral/90 hover:to-coral/80 text-white font-semibold py-3 px-5 rounded-full transition-all duration-300 hover:scale-105 border border-white/30 text-sm"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                        <Star className="w-4 h-4 inline-block mr-1.5" />
                        Write Review
                    </Link>
                )}

                <div className="pt-3 border-t border-charcoal/10">
                    <button
                        onClick={handleShare}
                        className="w-full flex items-center justify-center gap-2 bg-white/40 backdrop-blur-sm hover:bg-charcoal text-charcoal hover:text-white py-2.5 px-4 rounded-full transition-all duration-200 border-none text-sm font-medium"
                        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                    >
                        <Share2 className="w-4 h-4" />
                        Share Special
                    </button>
                </div>
            </div>
        </m.div>
    );
}
