/**
 * Personalization Service
 * 
 * Implements the Sayso personalization algorithm using:
 * - Interests: Broad categories the user likes
 * - Subcategories: Specific tastes the user likes
 * - Deal Breakers: Things the user avoids/hates
 * 
 * Formula:
 * score = interest_match + subcategory_match - dealbreaker_penalty + distance_score + rating_score + freshness_score
 */

export interface BusinessForScoring {
  id: string;
  interest_id?: string | null;
  sub_interest_id?: string | null;
  category?: string;
  price_range?: string;
  average_rating?: number;
  total_reviews?: number;
  distance_km?: number | null;
  percentiles?: Record<string, number> | null;
  verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferences {
  interestIds: string[];
  subcategoryIds: string[];
  dealbreakerIds: string[];
  latitude?: number | null;
  longitude?: number | null;
}

export interface PersonalizationScore {
  totalScore: number;
  breakdown: {
    interestMatch: number;
    subcategoryMatch: number;
    dealbreakerPenalty: number;
    distanceScore: number;
    ratingScore: number;
    freshnessScore: number;
  };
  insights: string[];
}

/**
 * Deal breaker rules - maps deal breaker IDs to business evaluation functions
 */
const DEALBREAKER_RULES: Record<string, (business: BusinessForScoring) => boolean> = {
  'trustworthiness': (business) => business.verified !== false,
  'punctuality': (business) => {
    const punctualityScore = business.percentiles?.punctuality ?? 80;
    return punctualityScore >= 70;
  },
  'friendliness': (business) => {
    const friendlinessScore = business.percentiles?.friendliness ?? 80;
    return friendlinessScore >= 65;
  },
  'value-for-money': (business) => {
    if (business.price_range) {
      return business.price_range === '$' || business.price_range === '$$';
    }
    const costEffectivenessScore = business.percentiles?.['cost-effectiveness'] ?? 85;
    return costEffectivenessScore >= 75;
  },
  'expensive': (business) => {
    // If user marked "expensive" as deal breaker, filter out high price ranges
    return business.price_range !== '$$$$' && business.price_range !== '$$$';
  },
  'slow-service': (business) => {
    const punctualityScore = business.percentiles?.punctuality ?? 80;
    return punctualityScore >= 60; // Higher threshold for "slow service" deal breaker
  },
  'no-parking': (business) => {
    // This would need to be checked against business attributes
    // For now, we'll assume it passes if not explicitly marked
    return true;
  },
  'cash-only': (business) => {
    // This would need to be checked against business attributes
    // For now, we'll assume it passes if not explicitly marked
    return true;
  },
  'bad-hygiene': (business) => {
    // This would need to be checked against business attributes or reviews
    // For now, we'll assume it passes if not explicitly marked
    return true;
  },
};

/**
 * Calculate interest match score
 * Higher score if business matches user's interests
 */
function calculateInterestMatch(
  business: BusinessForScoring,
  userInterestIds: string[]
): number {
  if (userInterestIds.length === 0) return 0;
  if (!business.interest_id) return 0;
  
  const match = userInterestIds.includes(business.interest_id);
  return match ? 15 : 0; // Strong weight for interest match
}

/**
 * Calculate subcategory match score
 * Higher score if business matches user's specific subcategories
 */
function calculateSubcategoryMatch(
  business: BusinessForScoring,
  userSubcategoryIds: string[]
): number {
  if (userSubcategoryIds.length === 0) return 0;
  if (!business.sub_interest_id) return 0;
  
  const match = userSubcategoryIds.includes(business.sub_interest_id);
  return match ? 25 : 0; // Strongest weight for subcategory match (most specific)
}

/**
 * Calculate deal breaker penalty
 * Returns negative score if business violates user's deal breakers
 */
function calculateDealbreakerPenalty(
  business: BusinessForScoring,
  userDealbreakerIds: string[]
): number {
  if (userDealbreakerIds.length === 0) return 0;
  
  let penalty = 0;
  let violations = 0;
  
  for (const dealbreakerId of userDealbreakerIds) {
    const rule = DEALBREAKER_RULES[dealbreakerId];
    if (rule) {
      try {
        const passes = rule(business);
        if (!passes) {
          violations++;
          penalty -= 50; // Heavy penalty for each violation
        }
      } catch (error) {
        // If rule evaluation fails, don't penalize
        console.warn(`[Personalization] Deal breaker rule failed for ${dealbreakerId}:`, error);
      }
    }
  }
  
  return penalty;
}

/**
 * Calculate distance score
 * Higher score for businesses closer to user
 */
function calculateDistanceScore(
  business: BusinessForScoring,
  userLatitude?: number | null,
  userLongitude?: number | null
): number {
  if (!userLatitude || !userLongitude || !business.distance_km) {
    return 0;
  }
  
  const distance = business.distance_km;
  
  // Score decreases with distance
  // 0-1km: 10 points
  // 1-5km: 8 points
  // 5-10km: 5 points
  // 10-20km: 2 points
  // >20km: 0 points
  if (distance <= 1) return 10;
  if (distance <= 5) return 8;
  if (distance <= 10) return 5;
  if (distance <= 20) return 2;
  return 0;
}

/**
 * Calculate rating score
 * Higher score for businesses with better ratings and more reviews
 */
function calculateRatingScore(business: BusinessForScoring): number {
  const rating = business.average_rating || 0;
  const reviews = business.total_reviews || 0;
  
  // Base score from rating (0-5 scale, normalized to 0-15 points)
  const ratingScore = rating * 3;
  
  // Bonus for review count (logarithmic scale to avoid overwhelming)
  const reviewBonus = Math.log(Math.max(reviews, 1) + 1) * 0.5;
  
  // Verified bonus
  const verifiedBonus = business.verified ? 2 : 0;
  
  return ratingScore + reviewBonus + verifiedBonus;
}

/**
 * Calculate freshness score
 * Higher score for businesses with recent activity (reviews, updates)
 */
function calculateFreshnessScore(business: BusinessForScoring): number {
  let score = 0;
  
  // Recent reviews boost (if business has many recent reviews)
  if (business.total_reviews && business.total_reviews > 0) {
    // Assume businesses with reviews are more "fresh"
    score += Math.min(business.total_reviews / 10, 3); // Cap at 3 points
  }
  
  // Recent update boost
  if (business.updated_at) {
    const updatedDate = new Date(business.updated_at);
    const daysSinceUpdate = (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate <= 7) score += 2; // Very recent
    else if (daysSinceUpdate <= 30) score += 1; // Recent
    else if (daysSinceUpdate <= 90) score += 0.5; // Somewhat recent
  }
  
  return score;
}

/**
 * Generate personalized insights for a business
 */
function generateInsights(
  business: BusinessForScoring,
  userPreferences: UserPreferences
): string[] {
  const insights: string[] = [];
  
  // Interest match insight
  if (business.interest_id && userPreferences.interestIds.includes(business.interest_id)) {
    insights.push(`Matches your interest in ${business.category || 'this category'}`);
  }
  
  // Subcategory match insight
  if (business.sub_interest_id && userPreferences.subcategoryIds.includes(business.sub_interest_id)) {
    insights.push(`Perfect match for your preferred ${business.category || 'category'}`);
  }
  
  // High rating insight
  if (business.average_rating && business.average_rating >= 4.5) {
    insights.push(`Highly rated with ${business.average_rating.toFixed(1)} stars`);
  }
  
  // Friendliness insight
  if (business.percentiles?.friendliness && business.percentiles.friendliness >= 80) {
    insights.push(`Known for excellent friendliness`);
  }
  
  // Punctuality insight
  if (business.percentiles?.punctuality && business.percentiles.punctuality >= 80) {
    insights.push(`Known for fast, punctual service`);
  }
  
  // Value insight
  if (business.price_range === '$' || business.price_range === '$$') {
    insights.push(`Great value for money`);
  }
  
  // Deal breaker warnings
  const violations: string[] = [];
  for (const dealbreakerId of userPreferences.dealbreakerIds) {
    const rule = DEALBREAKER_RULES[dealbreakerId];
    if (rule) {
      try {
        const passes = rule(business);
        if (!passes) {
          violations.push(dealbreakerId);
        }
      } catch {
        // Ignore rule evaluation errors
      }
    }
  }
  
  if (violations.length > 0) {
    insights.push(`⚠️ May not match your preferences: ${violations.join(', ')}`);
  }
  
  return insights;
}

/**
 * Calculate personalization score for a business
 */
export function calculatePersonalizationScore(
  business: BusinessForScoring,
  userPreferences: UserPreferences
): PersonalizationScore {
  const interestMatch = calculateInterestMatch(business, userPreferences.interestIds);
  const subcategoryMatch = calculateSubcategoryMatch(business, userPreferences.subcategoryIds);
  const dealbreakerPenalty = calculateDealbreakerPenalty(business, userPreferences.dealbreakerIds);
  const distanceScore = calculateDistanceScore(
    business,
    userPreferences.latitude,
    userPreferences.longitude
  );
  const ratingScore = calculateRatingScore(business);
  const freshnessScore = calculateFreshnessScore(business);
  
  const totalScore = 
    interestMatch +
    subcategoryMatch +
    dealbreakerPenalty + // This is negative, so it subtracts
    distanceScore +
    ratingScore +
    freshnessScore;
  
  const insights = generateInsights(business, userPreferences);
  
  return {
    totalScore,
    breakdown: {
      interestMatch,
      subcategoryMatch,
      dealbreakerPenalty,
      distanceScore,
      ratingScore,
      freshnessScore,
    },
    insights,
  };
}

/**
 * Sort businesses by personalization score (highest first)
 */
export function sortByPersonalization(
  businesses: BusinessForScoring[],
  userPreferences: UserPreferences
): BusinessForScoring[] {
  return businesses
    .map(business => ({
      business,
      score: calculatePersonalizationScore(business, userPreferences),
    }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore)
    .map(item => item.business);
}

/**
 * Filter businesses that violate deal breakers
 * Returns businesses that pass all deal breaker checks
 */
export function filterByDealbreakers(
  businesses: BusinessForScoring[],
  userDealbreakerIds: string[]
): BusinessForScoring[] {
  if (userDealbreakerIds.length === 0) {
    return businesses;
  }
  
  return businesses.filter(business => {
    for (const dealbreakerId of userDealbreakerIds) {
      const rule = DEALBREAKER_RULES[dealbreakerId];
      if (rule) {
        try {
          const passes = rule(business);
          if (!passes) {
            return false; // Business violates this deal breaker
          }
        } catch {
          // If rule evaluation fails, allow the business through
          return true;
        }
      }
    }
    return true; // Business passes all deal breaker checks
  });
}

/**
 * Boost businesses matching user's interests/subcategories
 * Returns businesses with boosted scores
 */
export function boostPersonalMatches(
  businesses: BusinessForScoring[],
  userPreferences: UserPreferences
): BusinessForScoring[] {
  return businesses.map(business => {
    const score = calculatePersonalizationScore(business, userPreferences);
    
    // Add personalization_score property for tracking
    return {
      ...business,
      personalization_score: score.totalScore,
    } as BusinessForScoring & { personalization_score: number };
  });
}

