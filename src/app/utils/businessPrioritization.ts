/**
 * Business Prioritization System
 *
 * Tiered ranking to surface well-classified businesses first:
 * - Tier 1 (highest): Canonical sub_interest_id (one of the canonical taxonomy slugs) + uploaded images bonus
 * - Tier 2 (medium): Known interest slug but no canonical subcategory
 * - Tier 3 (lowest): Missing classification, "Miscellaneous", or category label only
 *
 * Miscellaneous is deprioritized, not removed: Tier 3 items with high rating, many
 * reviews, or recency get a boost so they still surface (don't permanently bury new/uncategorized).
 */

import { CANONICAL_SUBCATEGORY_SLUGS, INTEREST_LABELS } from './subcategoryPlaceholders';

/** Minimal shape needed for tier/priority; feed items (e.g. Business, SearchResult) extend this. */
export type BusinessWithClassification = {
  id: string;
  sub_interest_id?: string | null;
  subInterestId?: string | null;
  interest_id?: string | null;
  interestId?: string | null;
  category?: string | null;
  uploaded_images?: string[] | null;
  image_url?: string | null;
  /** For Tier 3 boost: high rating / many reviews surface earlier */
  average_rating?: number | null;
  total_reviews?: number | null;
  reviews?: number | null;
  totalRating?: number | null;
  /** Optional: recency (e.g. updated_at) for boost */
  updated_at?: string | null;
  /** Optional: trending/relevance score from API */
  trendingScore?: number | null;
};

/** Normalize interest id for Tier 2 check (lowercase, trimmed) */
function normalizeInterestId(value: string | null | undefined): string | null {
  if (value == null || typeof value !== 'string') return null;
  const s = value.trim().toLowerCase();
  return s || null;
}

/** Known interest slugs (top-level) — from subcategoryPlaceholders, exclude miscellaneous */
const KNOWN_INTEREST_SLUGS = Object.keys(INTEREST_LABELS).filter(
  (slug) => slug !== 'miscellaneous'
) as string[];
export enum BusinessTier {
  TIER_1_CANONICAL = 1,
  TIER_2_INTEREST = 2,
  TIER_3_MISCELLANEOUS = 3,
}

/**
 * Calculate business tier based on classification quality.
 * Tier 3 includes: missing sub_interest_id, resolves to "Miscellaneous", or category is label-only (no valid slug).
 */
export function getBusinessTier(business: BusinessWithClassification): BusinessTier {
  const subInterestId = (business.sub_interest_id ?? business.subInterestId)?.trim().toLowerCase();
  const interestId = normalizeInterestId(business.interest_id ?? business.interestId);

  // Tier 1: Has canonical sub_interest_id, excluding "miscellaneous"
  if (subInterestId && CANONICAL_SUBCATEGORY_SLUGS.includes(subInterestId as (typeof CANONICAL_SUBCATEGORY_SLUGS)[number])) {
    if (subInterestId === 'miscellaneous') return BusinessTier.TIER_3_MISCELLANEOUS;
    return BusinessTier.TIER_1_CANONICAL;
  }

  // Tier 2: Known interest slug but no canonical subcategory
  if (interestId && KNOWN_INTEREST_SLUGS.includes(interestId)) return BusinessTier.TIER_2_INTEREST;

  // Tier 3: Missing classification, miscellaneous, or category label only (no valid slug)
  return BusinessTier.TIER_3_MISCELLANEOUS;
}

/**
 * Check if business has uploaded (non-placeholder) images
 */
export function hasUploadedImages(business: BusinessWithClassification): boolean {
  // Check uploaded_images array first
  if (business.uploaded_images && Array.isArray(business.uploaded_images) && business.uploaded_images.length > 0) {
    return true;
  }
  
  // Check if image_url exists and doesn't look like a placeholder
  if (business.image_url) {
    const isPlaceholder = business.image_url.includes('/businessImagePlaceholders/') || 
                         business.image_url.includes('placeholder');
    return !isPlaceholder;
  }
  
  return false;
}

/** Max boost for Tier 3 (Miscellaneous) so they never outrank Tier 2 (score stays >= 2000) */
const TIER_3_MAX_BOOST = 999;

/**
 * Boost for Tier 3 (Miscellaneous) so strong items still surface: high rating, many reviews, recency.
 * Don't permanently bury new/uncategorized businesses.
 */
export function getMiscellaneousBoost(business: BusinessWithClassification): number {
  const rating = Number(business.average_rating ?? business.totalRating ?? 0);
  const reviews = Number(business.total_reviews ?? business.reviews ?? 0);
  const trendingScore = business.trendingScore != null ? Number(business.trendingScore) : 0;
  let boost = 0;

  if (rating >= 4) boost += 120;
  else if (rating >= 3.5) boost += 60;

  if (reviews >= 10) boost += 120;
  else if (reviews >= 5) boost += 60;

  if (trendingScore > 0) boost += 60;

  const updatedAt = business.updated_at;
  if (updatedAt && typeof updatedAt === 'string') {
    const ageMs = Date.now() - new Date(updatedAt).getTime();
    if (ageMs < 7 * 24 * 60 * 60 * 1000) boost += 50; // updated in last 7 days
  }

  return Math.min(boost, TIER_3_MAX_BOOST);
}

/**
 * Calculate priority score for business (lower = higher priority).
 * Tier 3 items get a boost so high-quality Miscellaneous still surface.
 */
export function getBusinessPriorityScore(business: BusinessWithClassification): number {
  const tier = getBusinessTier(business);
  const hasImages = hasUploadedImages(business);

  let score = tier * 1000;

  if (hasImages && tier === BusinessTier.TIER_1_CANONICAL) score -= 100;

  if (tier === BusinessTier.TIER_3_MISCELLANEOUS) score -= getMiscellaneousBoost(business);

  return score;
}

/**
 * Sort businesses by priority: Tier 1 (canonical) first, then Tier 2 (interest), then Tier 3 (misc).
 * Within Tier 1, those with uploaded images rank higher. Within Tier 3, high rating / many reviews
 * / recency get a boost so Miscellaneous is deprioritized but not buried.
 */
export function sortBusinessesByPriority<T extends BusinessWithClassification>(
  businesses: T[]
): T[] {
  return [...businesses].sort((a, b) => getBusinessPriorityScore(a) - getBusinessPriorityScore(b));
}

/**
 * Get tier statistics for debugging/analytics
 */
export function getBusinessTierStats(businesses: BusinessWithClassification[]): {
  tier1: number;
  tier2: number;
  tier3: number;
  tier1WithImages: number;
  total: number;
} {
  const stats = {
    tier1: 0,
    tier2: 0,
    tier3: 0,
    tier1WithImages: 0,
    total: businesses.length,
  };
  
  businesses.forEach(business => {
    const tier = getBusinessTier(business);
    const hasImages = hasUploadedImages(business);
    
    if (tier === BusinessTier.TIER_1_CANONICAL) {
      stats.tier1++;
      if (hasImages) stats.tier1WithImages++;
    } else if (tier === BusinessTier.TIER_2_INTEREST) {
      stats.tier2++;
    } else {
      stats.tier3++;
    }
  });
  
  return stats;
}
