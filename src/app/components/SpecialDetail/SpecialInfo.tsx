// src/components/SpecialDetail/SpecialInfo.tsx
"use client";

import { Star, MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface SpecialInfoProps {
    special: {
        title: string;
        rating?: number;
        location?: string;
        price?: string | null;
    };
}

export default function SpecialInfo({ special }: SpecialInfoProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="space-y-3 px-2"
        >
            <h1
                className="text-2xl sm:text-3xl font-bold text-charcoal leading-tight"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
                {special.title}
            </h1>
            <div className="flex items-center gap-4">
                {special.rating && (
                    <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span
                            className="text-sm font-semibold text-charcoal"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                            {special.rating.toFixed(1)}
                        </span>
                    </div>
                )}
                {special.location && (
                    <div className="flex items-center gap-2 text-charcoal/70">
                        <MapPin className="w-4 h-4" />
                        <span
                            className="text-sm font-medium"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                            {special.location}
                        </span>
                    </div>
                )}
                {special.price && (
                    <div className="text-sm font-semibold text-sage">
                        {special.price}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
