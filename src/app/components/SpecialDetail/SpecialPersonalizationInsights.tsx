// src/components/SpecialDetail/SpecialPersonalizationInsights.tsx
"use client";

import { Sparkles, Star, MapPin, TrendingUp } from "lucide-react";

interface SpecialPersonalizationInsightsProps {
    special: {
        id: string;
        category?: string;
        rating?: number;
        totalReviews?: number;
        distanceKm?: number | null;
    };
}

export default function SpecialPersonalizationInsights({
    special,
}: SpecialPersonalizationInsightsProps) {
    const insights = [];

    // High rating insight
    if (special.rating && special.rating >= 4.5) {
        insights.push({
            icon: <Star className="w-4 h-4" />,
            text: "Highly rated special",
            color: "text-amber-500",
        });
    }

    // Popular special insight
    if (special.totalReviews && special.totalReviews >= 30) {
        insights.push({
            icon: <TrendingUp className="w-4 h-4" />,
            text: "Popular with customers",
            color: "text-sage",
        });
    }

    // Nearby insight
    if (special.distanceKm && special.distanceKm < 5) {
        insights.push({
            icon: <MapPin className="w-4 h-4" />,
            text: `Only ${special.distanceKm.toFixed(1)}km away`,
            color: "text-coral",
        });
    }

    if (insights.length === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-sage/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-navbar-bg/90" />
                </div>
                <h3
                    className="text-base font-semibold text-charcoal"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                    Why You'll Love This
                </h3>
            </div>
            <div className="space-y-3">
                {insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-2.5">
                        <div className={`${insight.color} mt-0.5 flex-shrink-0`}>
                            {insight.icon}
                        </div>
                        <p
                            className="text-sm text-charcoal/80 leading-relaxed"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                            {insight.text}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
