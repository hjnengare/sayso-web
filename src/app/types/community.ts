/**
 * Type definitions for community features (reviewers, reviews, businesses)
 * Used across the application for type safety
 */

export interface Reviewer {
  id: string;
  name: string;
  username?: string;
  profilePicture: string;
  reviewCount: number;
  rating: number;
  /** Average rating the reviewer gives across all their reviews (1–5, 1 decimal). Null when they have no reviews yet. */
  avgRatingGiven?: number | null;
  /** Total helpful votes received across all their reviews. */
  helpfulVotes?: number;
  badge?: "top" | "verified" | "local";
  trophyBadge?: "gold" | "silver" | "bronze" | "rising-star" | "community-favorite";
  badgesCount?: number;
  badges?: Array<{ id: string; name: string; icon_path?: string; badge_group?: string }>;
  location: string;
}

export interface Review {
  id: string;
  reviewer: Reviewer;
  businessName: string;
  businessType: string;
  businessId?: string;
  rating: number;
  reviewText: string;
  date: string;
  likes: number;
  tags?: string[];
  images?: string[];
}

export interface BusinessOfTheMonth {
  id: string;
  name: string;
  category: string;
  category_label?: string;
  image: string;
  rating: number;
  reviewCount: number;
  description: string;
  location: string;
  badge: "gold" | "silver" | "bronze" | "featured";
  rank: number;
  // Optional fields used across leaderboard and highlights views
  totalRating?: number;
  reviews?: number;
  interestId?: string;
  subInterestId?: string;
  subInterestLabel?: string;
  image_url?: string;
  uploaded_images?: string[];
  alt?: string;
  href?: string;
  slug?: string;
  monthAchievement?: string;
  stats?: {
    average_rating?: number;
    total_reviews?: number;
    percentiles?: Record<string, number> | null;
  };
  percentiles?: Record<string, number> | null;
  verified?: boolean;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  top_review_preview?: {
    content: string;
    rating?: number | null;
    createdAt?: string | null;
  } | null;
}
