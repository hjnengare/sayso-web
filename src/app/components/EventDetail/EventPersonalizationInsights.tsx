// src/components/EventDetail/EventPersonalizationInsights.tsx
"use client";

import { Sparkles, Star, MapPin, TrendingUp } from "lucide-react";

interface EventPersonalizationInsightsProps {
    event: {
        id: string;
        category?: string;
        rating?: number;
        totalReviews?: number;
        distanceKm?: number | null;
    };
}

export default function EventPersonalizationInsights({
    event,
}: EventPersonalizationInsightsProps) {
    const insights = [];

    // High rating insight
    if (event.rating && event.rating >= 4.5) {
        insights.push({
            icon: <Star className="w-4 h-4" />,
            text: "Highly rated event",
            color: "text-amber-500",
        });
    }

    // Popular event insight
    if (event.totalReviews && event.totalReviews >= 50) {
        insights.push({
            icon: <TrendingUp className="w-4 h-4" />,
            text: "Popular with attendees",
            color: "text-sage",
        });
    }

    // Nearby insight
    if (event.distanceKm && event.distanceKm < 5) {
        insights.push({
            icon: <MapPin className="w-4 h-4" />,
            text: `Only ${event.distanceKm.toFixed(1)}km away`,
            color: "text-coral",
        });
    }

    if (insights.length === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                    <Sparkles className="w-4 h-4 text-charcoal/85" />
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
                        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors mt-0.5 text-charcoal/85">
                            {insight.icon}
                        </span>
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
