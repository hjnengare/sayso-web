/**
 * User Profile Enhancement Types
 * Types for extended user profile features
 */

export interface SocialLinks {
  instagram?: string;
  x?: string;
  twitter?: string;
  tiktok?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  [key: string]: string | undefined;
}

export interface PrivacySettings {
  showActivity: boolean;
  showStats: boolean;
  showSavedBusinesses: boolean;
}

export interface EnhancedProfile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website_url?: string;
  social_links: SocialLinks;
  privacy_settings: PrivacySettings;
  created_at: string;
  updated_at: string;
  last_active_at?: string;
  // Existing profile fields
  onboarding_step?: string;
  onboarding_complete?: boolean;
  interests_count?: number;
  reviews_count?: number;
  badges_count?: number;
}

export interface UpdateProfilePayload {
  bio?: string;
  location?: string;
  website_url?: string;
  social_links?: SocialLinks;
}

export interface UpdatePreferencesPayload {
  interests?: string[];
  dealBreakers?: string[];
  privacy_settings?: Partial<PrivacySettings>;
}

export interface UserStats {
  totalReviewsWritten: number;
  totalHelpfulVotesGiven: number;
  totalBusinessesSaved: number;
  accountCreationDate: string;
  lastActiveDate: string;
  helpfulVotesReceived: number;
}

export type ActivityType = 'REVIEW' | 'SAVE' | 'UNSAVE' | 'HELPFUL_VOTE';

export interface UserActivityItem {
  id: string;
  type: ActivityType;
  createdAt: string;
  metadata: {
    businessId?: string;
    businessName?: string;
    businessSlug?: string;
    businessImage?: string;
    reviewId?: string;
    reviewTitle?: string;
    reviewSnippet?: string;
    rating?: number;
    [key: string]: any;
  };
}

export interface UserReview {
  id: string;
  business_id: string;
  rating: number;
  title?: string;
  body: string;
  created_at: string;
  updated_at: string;
  helpful_count: number;
  business?: {
    id: string;
    name: string;
    slug?: string;
    image_url?: string;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T> {
  data: T | null;
  error: {
    message: string;
    code?: string;
  } | null;
}

