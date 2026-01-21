"use client";

import { useMemo } from "react";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import {
  calculatePersonalizationScore,
  type BusinessForScoring,
} from "../../lib/services/personalizationService";
import { CheckCircle, Info } from "lucide-react";
import PercentileChipsSection from "./PercentileChipsSection";

interface PersonalizationInsightsProps {
  business: {
    id: string;
    interestId?: string | null;
    subInterestId?: string | null;
    category?: string;
    priceRange?: string;
    averageRating?: number;
    totalReviews?: number;
    distanceKm?: number | null;
    percentiles?: Record<string, number> | null;
    verified?: boolean;
  };
}

export default function PersonalizationInsights({ business }: PersonalizationInsightsProps) {
  const { interests, subcategories, dealbreakers } = useUserPreferences();

  const userPreferences = useMemo(
    () => ({
      interestIds: interests.map((i) => i.id),
      subcategoryIds: subcategories.map((s) => s.id),
      dealbreakerIds: dealbreakers.map((d) => d.id),
    }),
    [interests, subcategories, dealbreakers]
  );

  // Don't show insights if user has no preferences
  if (
    userPreferences.interestIds.length === 0 &&
    userPreferences.subcategoryIds.length === 0 &&
    userPreferences.dealbreakerIds.length === 0
  ) {
    return null;
  }

  const businessForScoring: BusinessForScoring = {
    id: business.id,
    interest_id: business.interestId || null,
    sub_interest_id: business.subInterestId || null,
    category: business.category,
    price_range: business.priceRange,
    average_rating: business.averageRating,
    total_reviews: business.totalReviews,
    distance_km: business.distanceKm,
    percentiles: business.percentiles || null,
    verified: business.verified,
  };

  const score = calculatePersonalizationScore(businessForScoring, userPreferences);

  // Only keep positive insights (drop warnings / negative insights)
  const positiveInsights = score.insights
    .filter((i) => typeof i === "string" && i.trim().length > 0)
    .filter((i) => !i.startsWith("⚠️"));

  // Don't show if no positive insights
  if (positiveInsights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Personalization Insights */}
      <div className="bg-gradient-to-br from-sage/10 via-sage/5 to-transparent border border-sage/20 rounded-[20px] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sage" />
          <h3 className="text-sm font-semibold text-charcoal">Personalized for You</h3>
        </div>

        <div className="space-y-2">
          {positiveInsights.map((insight, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-charcoal/80">
              <CheckCircle className="w-4 h-4 text-sage mt-0.5 flex-shrink-0" />
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <PercentileChipsSection
        punctuality={business.percentiles?.punctuality || 0}
        costEffectiveness={business.percentiles?.['cost-effectiveness'] || 0}
        friendliness={business.percentiles?.friendliness || 0}
        trustworthiness={business.percentiles?.trustworthiness || 0}
      />
    </div>
  );
}
