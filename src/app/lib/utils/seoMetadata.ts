/**
 * SEO Metadata Utility
 * Generates consistent SEO metadata for all pages with beautiful titles
 */

import { Metadata } from 'next';
import { generatePageTitle, PageTitles, getBusinessPageTitle, getReviewPageTitle, getCategoryPageTitle, getCityPageTitle, getReviewerPageTitle, getEventPageTitle } from './pageTitle';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sayso-nine.vercel.app';
const siteName = 'sayso';

export interface SEOOptions {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  nofollow?: boolean;
}

/**
 * Generate SEO metadata for a page
 */
export function generateSEOMetadata(options: SEOOptions = {}): Metadata {
  const {
    title,
    description,
    keywords = [],
    image,
    url,
    type = 'website',
    noindex = false,
    nofollow = false,
  } = options;

  // Use beautiful title format if title is provided, otherwise use default
  // Use title as-is if it already includes SAYSO, otherwise format it
  const fullTitle = title 
    ? (title.includes(siteName) || title.includes("SAYSO"))
      ? title 
      : generatePageTitle(title, description)
    : PageTitles.home;
  const fullDescription = description || 'Find amazing local businesses, restaurants, and experiences in your area with personalized recommendations and trusted reviews.';
  const ogImage = image || `${baseUrl}/og-image.jpg`;
  const canonicalUrl = url ? `${baseUrl}${url}` : baseUrl;

  return {
    title: fullTitle,
    description: fullDescription,
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url: canonicalUrl,
      siteName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title || siteName,
        },
      ],
      locale: 'en_US',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: fullDescription,
      images: [ogImage],
      creator: '@sayso',
    },
    robots: {
      index: !noindex,
      follow: !nofollow,
      googleBot: {
        index: !noindex,
        follow: !nofollow,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/**
 * Predefined metadata for common pages
 */
export const PageMetadata = {
  home: (): Metadata => generateSEOMetadata({
    title: PageTitles.home,
    description: 'Discover personalized local business recommendations tailored to your interests. Find the best restaurants, services, and experiences in your area.',
    keywords: ['home', 'discover', 'local businesses', 'recommendations', 'personalized'],
    url: '/home',
  }),

  explore: (): Metadata => generateSEOMetadata({
    title: PageTitles.explore,
    description: 'Browse and discover amazing local businesses in your area. Filter by category, rating, distance, and more to find exactly what you\'re looking for.',
    keywords: ['explore', 'browse', 'local businesses', 'search', 'filter'],
    url: '/explore',
  }),

  forYou: (): Metadata => generateSEOMetadata({
    title: PageTitles.forYou,
    description: 'Personalized business recommendations based on your interests and preferences. Discover businesses tailored just for you.',
    keywords: ['for you', 'personalized', 'recommendations', 'tailored', 'interests'],
    url: '/for-you',
  }),

  trending: (): Metadata => generateSEOMetadata({
    title: PageTitles.trending,
    description: 'Discover the most popular and trending local businesses in your area. See what\'s hot right now.',
    keywords: ['trending', 'popular', 'hot', 'trending businesses', 'popular places'],
    url: '/trending',
  }),

  leaderboard: (): Metadata => generateSEOMetadata({
    title: PageTitles.leaderboard,
    description: 'See the top reviewers and businesses in your community. Discover the most active contributors and highest-rated establishments.',
    keywords: ['leaderboard', 'top reviewers', 'top businesses', 'community', 'rankings'],
    url: '/leaderboard',
  }),

  eventsSpecials: (): Metadata => generateSEOMetadata({
    title: PageTitles.events,
    description: 'Discover upcoming events, special offers, and promotions from local businesses. Never miss out on great deals and experiences.',
    keywords: ['events', 'specials', 'promotions', 'deals', 'offers', 'local events'],
    url: '/events-specials',
  }),

  dealBreakers: (): Metadata => generateSEOMetadata({
    title: PageTitles.dealBreakers,
    description: 'Customize your preferences and set deal breakers to filter out businesses that don\'t meet your criteria.',
    keywords: ['deal breakers', 'preferences', 'filters', 'customize'],
    url: '/deal-breakers',
  }),

  profile: (): Metadata => generateSEOMetadata({
    title: PageTitles.profile,
    description: 'View and manage your profile, reviews, and saved businesses.',
    keywords: ['profile', 'account', 'reviews', 'saved'],
    url: '/profile',
    noindex: true, // User profiles should not be indexed
  }),

  saved: (): Metadata => generateSEOMetadata({
    title: PageTitles.saved,
    description: 'View your saved businesses and bookmarks.',
    keywords: ['saved', 'bookmarks', 'favorites'],
    url: '/saved',
    noindex: true, // User-specific pages should not be indexed
  }),

  login: (): Metadata => generateSEOMetadata({
    title: PageTitles.login,
    description: 'Sign in to your SAYSO account to access personalized recommendations and manage your reviews.',
    keywords: ['login', 'sign in', 'account'],
    url: '/login',
    noindex: true,
  }),

  register: (): Metadata => generateSEOMetadata({
    title: PageTitles.register,
    description: 'Create a new SAYSO account to start discovering and reviewing local businesses.',
    keywords: ['register', 'sign up', 'create account'],
    url: '/register',
    noindex: true,
  }),

  business: (businessName: string, description?: string, image?: string, slug?: string): Metadata => generateSEOMetadata({
    title: getBusinessPageTitle(businessName, description || `Read reviews, view photos, and get all the information you need about ${businessName}`),
    description: description || `Discover ${businessName} - read reviews, view photos, and get all the information you need.`,
    keywords: [businessName, 'business', 'reviews', 'local business'],
    image,
    url: slug ? `/business/${slug}` : undefined,
    type: 'article',
  }),

  event: (eventTitle: string, description?: string, image?: string, id?: string): Metadata => generateSEOMetadata({
    title: getEventPageTitle(eventTitle),
    description: description || `Join us for ${eventTitle} - discover event details, location, and more.`,
    keywords: [eventTitle, 'event', 'local event', 'special'],
    image,
    url: id ? `/event/${id}` : undefined,
    type: 'article',
  }),

  reviewer: (reviewerName: string, id?: string): Metadata => generateSEOMetadata({
    title: getReviewerPageTitle(reviewerName),
    description: `View ${reviewerName}'s reviews and contributions to the sayso community.`,
    keywords: [reviewerName, 'reviewer', 'profile', 'reviews'],
    url: id ? `/reviewer/${id}` : undefined,
    type: 'profile',
    noindex: true, // Reviewer profiles may be indexed if public
  }),

  review: (businessName: string, slug?: string): Metadata => generateSEOMetadata({
    title: getReviewPageTitle(businessName),
    description: `Write a review for ${businessName} and share your experience with the community.`,
    keywords: [businessName, 'review', 'write review', 'rate business'],
    url: slug ? `/business/${slug}/review` : undefined,
    noindex: true, // Review forms should not be indexed
  }),

  category: (categoryName: string, slug?: string): Metadata => generateSEOMetadata({
    title: getCategoryPageTitle(categoryName),
    description: `Explore ${categoryName} businesses in your area. Find the best rated and most reviewed establishments.`,
    keywords: [categoryName, 'category', 'businesses', 'local businesses'],
    url: slug ? `/category/${slug}` : undefined,
  }),

  city: (cityName: string, slug?: string): Metadata => generateSEOMetadata({
    title: getCityPageTitle(cityName),
    description: `Discover the best local businesses in ${cityName}. Find restaurants, services, and experiences near you.`,
    keywords: [cityName, 'city', 'local businesses', 'location'],
    url: slug ? `/${slug}` : undefined,
  }),
};

