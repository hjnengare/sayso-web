// src/components/SpecialDetail/SpecialHeroImage.tsx
"use client";

import Image from "next/image";
import { Star, Heart, Percent } from "lucide-react";
import { motion } from "framer-motion";

interface SpecialHeroImageProps {
    special: {
        image?: string | null;
        title: string;
        alt?: string;
        rating?: number;
        price?: string | null;
    };
    isLiked?: boolean;
    onLike?: () => void;
}

export default function SpecialHeroImage({ special, isLiked = false, onLike }: SpecialHeroImageProps) {
    const imageSrc = special.image || "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1920&h=1080&fit=crop&crop=center&q=90";

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-none overflow-hidden border border-white/60 backdrop-blur-xl shadow-md"
        >
            <Image
                src={imageSrc}
                alt={special.alt || special.title}
                fill
                className="object-cover object-center"
                priority
                quality={90}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 900px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            
            {/* Special Badge */}
            <div className="absolute top-4 left-4 z-20">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage/90 text-white border border-sage/50 backdrop-blur-sm">
                    <Percent className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                        Special Offer
                    </span>
                </div>
            </div>

            {/* Rating Badge */}
            {special.rating && (
                <div className="absolute top-4 right-4 z-20">
                    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-white/60">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                            {special.rating.toFixed(1)}
                        </span>
                    </div>
                </div>
            )}

            {/* Like Button */}
            {onLike && (
                <button
                    onClick={onLike}
                    className={`absolute bottom-4 right-4 z-20 w-11 h-11 rounded-full backdrop-blur-md border transition-all duration-300 hover:scale-110 ${
                        isLiked
                            ? "bg-coral/90 text-white border-coral/50"
                            : "bg-white/20 text-white border-white/30 hover:bg-white/30"
                    }`}
                    aria-label={isLiked ? "Unlike special" : "Like special"}
                >
                    <Heart className={`mx-auto w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
                </button>
            )}
        </motion.div>
    );
}
