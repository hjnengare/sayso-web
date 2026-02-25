/**
 * Utility functions for generating beautiful, consistent page titles
 * Format: SAYSO (Page Name) | Description
 */

const SITE_NAME = "SAYSO";

/**
 * Generate a beautiful page title with consistent formatting
 * Format: SAYSO (Page Name) | Description
 * 
 * @param pageName - The page-specific name (e.g., "Home", "Profile", "Business Name")
 * @param description - The page description (optional)
 * @returns Formatted title string
 * 
 * @example
 * // "SAYSO (Home) | Discover trusted local gems near you"
 * generatePageTitle("Home", "Discover trusted local gems near you")
 * 
 * @example
 * // "SAYSO (The Green Table) | Read reviews and see photos"
 * generatePageTitle("The Green Table", "Read reviews and see photos")
 */
export function generatePageTitle(
  pageName: string,
  description?: string
): string {
  let title = `${SITE_NAME} (${pageName})`;
  
  if (description) {
    title = `${title} | ${description}`;
  }
  
  return title;
}

/**
 * Common page title configurations
 */
export const PageTitles = {
  home: generatePageTitle("Home", "Discover trusted local gems near you"),
  forYou: generatePageTitle("For You", "Personalized recommendations just for you"),
  trending: generatePageTitle("Trending Now", "See what's hot right now"),
  explore: generatePageTitle("Explore", "Browse and discover amazing local businesses"),
  saved: generatePageTitle("Saved", "Your saved businesses and bookmarks"),
  profile: generatePageTitle("Profile", "View and manage your profile"),
  login: generatePageTitle("Login", "Sign in to your account"),
  register: generatePageTitle("Sign Up", "Create a new account"),
  forgotPassword: generatePageTitle("Forgot Password", "Reset your account password"),
  resetPassword: generatePageTitle("Reset Password", "Create a new password"),
  writeReview: generatePageTitle("Write a Review", "Share your experience"),
  discoverReviews: generatePageTitle("Discover Reviews", "Read authentic reviews"),
  events: generatePageTitle("Events & Specials", "Discover upcoming events and special offers"),
  leaderboard: generatePageTitle("Leaderboard", "See top reviewers and businesses"),
  onboarding: generatePageTitle("Welcome", "Welcome to SAYSO"),
  dealBreakers: generatePageTitle("Deal Breakers", "Customize your preferences"),
  interests: generatePageTitle("Interests", "Select your interests"),
  subcategories: generatePageTitle("Categories", "Browse by category"),
  complete: generatePageTitle("Complete", "Onboarding complete"),
  verifyEmail: generatePageTitle("Verify Email", "Verify your email address"),
  claimBusiness: generatePageTitle("Claim Business", "Claim your business listing"),
  manageBusiness: generatePageTitle("Manage Business", "Manage your business"),
  notifications: generatePageTitle("Notifications", "Stay updated with your notifications"),
} as const;

/**
 * Generate title for business pages
 */
export function getBusinessPageTitle(businessName: string, description?: string): string {
  return generatePageTitle(businessName, description || "Read reviews and see photos");
}

/**
 * Generate title for review pages
 */
export function getReviewPageTitle(businessName: string): string {
  return generatePageTitle(`Review ${businessName}`, "Write a review for this business");
}

/**
 * Generate title for category pages
 */
export function getCategoryPageTitle(categoryName: string): string {
  return generatePageTitle(categoryName, "Explore businesses in this category");
}

/**
 * Generate title for city pages
 */
export function getCityPageTitle(cityName: string): string {
  return generatePageTitle(`${cityName} Businesses`, `Discover local businesses in ${cityName}`);
}

/**
 * Generate title for reviewer/profile pages
 */
export function getReviewerPageTitle(username: string): string {
  return generatePageTitle(`${username}'s Reviews`, `View ${username}'s reviews and contributions`);
}

/**
 * Generate title for event/special pages
 */
export function getEventPageTitle(eventName: string, description?: string): string {
  return generatePageTitle(eventName, description || "Discover event details and more");
}

