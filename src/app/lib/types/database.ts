export interface User {
  id: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  role?: 'user' | 'business_owner' | 'both';
  current_role?: 'user' | 'business_owner';
  email?: string;
  onboarding_step: string;
  onboarding_complete: boolean;
  interests_count: number;
  last_interests_updated?: string;
  interests?: string[];
  sub_interests?: string[];
  deal_breakers?: string[];
  avatar_url?: string;
  username?: string;
  display_name?: string;
  locale?: string;
  is_top_reviewer?: boolean;
  reviews_count?: number;
  badges_count?: number;
  subcategories_count?: number;
  dealbreakers_count?: number;
  created_at: string;
  updated_at: string;
  // Profile enhancements
  bio?: string;
  location?: string;
  website_url?: string;
  social_links?: Record<string, string>;
  privacy_settings?: {
    showActivity?: boolean;
    showStats?: boolean;
    showSavedBusinesses?: boolean;
  };
  last_active_at?: string;
  is_active?: boolean;
  deactivated_at?: string | null;
}

export interface UserInterest {
  id: string;
  user_id: string;
  interest_id: string;
  created_at: string;
}

export interface AuthUser extends User {
  profile?: Profile;
  interests?: string[];
}

export interface AuthError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  accountType?: 'user' | 'business_owner';
}

export interface SignInData {
  email: string;
  password: string;
}

export interface Business {
  id: string;
  name: string;
  description?: string;
  category: string;
  location: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  image_url?: string;
  verified: boolean;
  price_range: '$' | '$$' | '$$$' | '$$$$';
  created_at: string;
  updated_at: string;
  owner_id?: string;
}

export interface Review {
  id: string;
  business_id: string;
  user_id: string;
  rating: number; // 1-5
  title?: string;
  content: string;
  tags: string[];
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewImage {
  id: string;
  review_id: string;
  image_url: string;
  alt_text?: string;
  created_at: string;
}

export interface BusinessStats {
  business_id: string;
  total_reviews: number;
  average_rating: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  percentiles: {
    punctuality: number;
    friendliness: number;
    trustworthiness: number;
    'cost-effectiveness': number;
  };
}

// Extended types for UI
export interface BusinessWithStats extends Business {
  stats?: BusinessStats;
  distance?: string;
  recent_reviews?: ReviewWithUser[];
}

export interface ReviewWithUser extends Review {
  user: {
    id: string;
    name?: string;
    username?: string | null;
    display_name?: string | null;
    email?: string | null;
    avatar_url?: string;
  };
  images?: ReviewImage[];
}

// Event Review Types
export interface EventReview {
  id: string;
  event_id: string;
  user_id: string;
  rating: number; // 1-5
  title?: string;
  content: string;
  tags: string[];
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface EventReviewImage {
  id: string;
  review_id: string;
  image_url: string;
  alt_text?: string;
  created_at: string;
}

export interface EventReviewWithUser extends EventReview {
  user: {
    id: string;
    name?: string;
    username?: string | null;
    display_name?: string | null;
    email?: string | null;
    avatar_url?: string;
  };
  images?: EventReviewImage[];
}

// Special Review Types
export interface SpecialReview {
  id: string;
  special_id: string;
  user_id: string;
  rating: number; // 1-5
  title?: string;
  content: string;
  tags: string[];
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface SpecialReviewImage {
  id: string;
  review_id: string;
  image_url: string;
  alt_text?: string;
  created_at: string;
}

export interface SpecialReviewWithUser extends SpecialReview {
  user: {
    id: string;
    name?: string;
    username?: string | null;
    display_name?: string | null;
    email?: string | null;
    avatar_url?: string;
  };
  images?: SpecialReviewImage[];
}

export interface ReviewFormData {
  business_id: string;
  rating: number;
  title?: string;
  content: string;
  tags: string[];
  images?: File[];
}

export interface EventReviewFormData {
  event_id: string;
  rating: number;
  title?: string;
  content: string;
  tags: string[];
  images?: File[];
}

export interface SpecialReviewFormData {
  special_id: string;
  rating: number;
  title?: string;
  content: string;
  tags: string[];
  images?: File[];
}

export interface BusinessSearchFilters {
  category?: string;
  location?: string;
  price_range?: string[];
  min_rating?: number;
  verified_only?: boolean;
  within_miles?: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'review' | 'business' | 'user' | 'highlyRated' | 'gamification';
  message: string;
  title: string;
  image?: string | null;
  image_alt?: string | null;
  link?: string | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationData {
  user_id?: string; // Optional, defaults to authenticated user
  type: 'review' | 'business' | 'user' | 'highlyRated' | 'gamification';
  message: string;
  title: string;
  image?: string;
  image_alt?: string;
  link?: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  count: number;
  unreadCount: number;
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}