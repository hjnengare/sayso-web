import type { Metadata } from 'next';

export const SITE_URL = 'https://sayso.co.za';
export const SITE_NAME = 'Sayso';
export const SITE_TAGLINE = 'Less guessing, and more confessing.';
export const BRAND_POSITIONING = 'Hyper-local reviews & discovery for Cape Town';
export const DEFAULT_SITE_DESCRIPTION =
  'Sayso is a hyper-local reviews and discovery app for Cape Town. Explore restaurants, salons, gyms, events, and more - with real community ratings.';

const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph-image`;

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

function normalizePath(path: string): string {
  if (!path) return '/';

  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      return `${url.pathname}${url.search}${url.hash}` || '/';
    } catch {
      return '/';
    }
  }

  return path.startsWith('/') ? path : `/${path}`;
}

export function getCanonicalUrl(path?: string): string {
  if (!path) return SITE_URL;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${SITE_URL}${normalizePath(path)}`;
}

export function toAbsoluteUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  if (url.startsWith('/')) {
    return `${SITE_URL}${url}`;
  }

  return `${SITE_URL}/${url}`;
}

function withBrandInTitle(title?: string): string {
  if (!title) {
    return `${SITE_NAME} | ${BRAND_POSITIONING}`;
  }

  return /sayso/i.test(title) ? title : `${title} | ${SITE_NAME}`;
}

/**
 * Generate SEO metadata for a page.
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

  const canonicalUrl = getCanonicalUrl(url);
  const fullTitle = withBrandInTitle(title);
  const ogTitle = fullTitle.includes(SITE_TAGLINE) ? fullTitle : `${fullTitle} | ${SITE_TAGLINE}`;
  const fullDescription = description || DEFAULT_SITE_DESCRIPTION;
  const ogImageUrl = toAbsoluteUrl(image) || DEFAULT_OG_IMAGE;

  return {
    metadataBase: new URL(SITE_URL),
    title: fullTitle,
    description: fullDescription,
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: ogTitle,
      description: fullDescription,
      url: canonicalUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} logo with slogan: ${SITE_TAGLINE}`,
        },
      ],
      locale: 'en_ZA',
      type,
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
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: fullDescription,
      images: [ogImageUrl],
    },
  };
}

/**
 * Predefined metadata for common pages.
 */
export const PageMetadata = {
  home: (): Metadata =>
    generateSEOMetadata({
      title: `${SITE_NAME} | ${BRAND_POSITIONING}`,
      description: DEFAULT_SITE_DESCRIPTION,
      keywords: [
        'sayso',
        'sayso reviews',
        'cape town reviews',
        'cape town restaurants',
        'hyper-local discovery',
      ],
      url: '/',
      type: 'website',
    }),

  explore: (): Metadata =>
    generateSEOMetadata({
      title: `Search Cape Town businesses and reviews | ${SITE_NAME}`,
      description:
        'Search Sayso to discover Cape Town restaurants, salons, gyms, events, and more with trusted hyper-local reviews.',
      keywords: ['search cape town businesses', 'cape town reviews', 'sayso search'],
      url: '/explore',
      type: 'website',
    }),

  forYou: (): Metadata =>
    generateSEOMetadata({
      title: `Personalized recommendations | ${SITE_NAME}`,
      description:
        'Personalized recommendations on Sayso based on your preferences and local Cape Town activity.',
      keywords: ['personalized recommendations', 'sayso'],
      url: '/for-you',
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  trending: (): Metadata =>
    generateSEOMetadata({
      title: `Trending places in Cape Town | ${SITE_NAME}`,
      description:
        'See trending Cape Town businesses and community favorites on Sayso.',
      keywords: ['trending cape town', 'cape town businesses', 'sayso'],
      url: '/trending',
      type: 'website',
    }),

  about: (): Metadata =>
    generateSEOMetadata({
      title: `About Sayso | Hyper-local reviews for Cape Town`,
      description:
        'Learn about Sayso — the hyper-local community review and discovery platform built for Cape Town. Real people, real places, real ratings.',
      keywords: ['about sayso', 'sayso cape town', 'hyper-local reviews', 'community platform'],
      url: '/about',
      type: 'website',
    }),

  leaderboard: (): Metadata =>
    generateSEOMetadata({
      title: `Top reviewers and businesses in Cape Town | ${SITE_NAME}`,
      description:
        'See top contributors and standout local businesses in Cape Town on Sayso.',
      keywords: ['cape town leaderboard', 'top reviewers', 'sayso community'],
      url: '/leaderboard',
      type: 'website',
    }),

  eventsSpecials: (): Metadata =>
    generateSEOMetadata({
      title: `Cape Town events and specials | ${SITE_NAME}`,
      description:
        'Discover upcoming Cape Town events and specials in one hyper-local feed on Sayso.',
      keywords: ['cape town events', 'cape town specials', 'sayso events'],
      url: '/events-specials',
      type: 'website',
    }),

  dealBreakers: (): Metadata =>
    generateSEOMetadata({
      title: `Deal breakers and preferences | ${SITE_NAME}`,
      description: 'Set your content and recommendation preferences in Sayso.',
      keywords: ['preferences', 'deal breakers', 'sayso'],
      url: '/deal-breakers',
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  profile: (): Metadata =>
    generateSEOMetadata({
      title: `My profile | ${SITE_NAME}`,
      description: 'Manage your Sayso profile, saved places, and activity.',
      keywords: ['sayso profile', 'account'],
      url: '/profile',
      noindex: true,
      nofollow: true,
      type: 'profile',
    }),

  saved: (): Metadata =>
    generateSEOMetadata({
      title: `Saved places | ${SITE_NAME}`,
      description: 'View your saved businesses and bookmarks on Sayso.',
      keywords: ['saved businesses', 'bookmarks', 'sayso'],
      url: '/saved',
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  login: (): Metadata =>
    generateSEOMetadata({
      title: `Log in | ${SITE_NAME}`,
      description: 'Log in to Sayso to manage your account and activity.',
      keywords: ['sayso login', 'sign in'],
      url: '/login',
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  register: (): Metadata =>
    generateSEOMetadata({
      title: `Create an account | ${SITE_NAME}`,
      description: 'Create your Sayso account to review and discover Cape Town businesses.',
      keywords: ['sayso register', 'create account'],
      url: '/register',
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  business: (businessName: string, description?: string, image?: string, slug?: string): Metadata =>
    generateSEOMetadata({
      title: `${businessName} reviews in Cape Town | ${SITE_NAME}`,
      description:
        description ||
        `${businessName} on Sayso: hyper-local reviews, ratings, photos, and business details for Cape Town discovery.`,
      keywords: [businessName, 'sayso reviews', 'cape town business reviews', 'hyper-local reviews'],
      image,
      url: slug ? `/business/${slug}` : undefined,
      type: 'article',
    }),

  event: (eventTitle: string, description?: string, image?: string, id?: string): Metadata =>
    generateSEOMetadata({
      title: `${eventTitle} in Cape Town | ${SITE_NAME}`,
      description:
        description ||
        `${eventTitle} on Sayso: discover dates, details, and community insights for Cape Town events.`,
      keywords: [eventTitle, 'cape town events', 'sayso events'],
      image,
      url: id ? `/event/${id}` : undefined,
      type: 'article',
    }),

  reviewer: (reviewerName: string, id?: string): Metadata =>
    generateSEOMetadata({
      title: `${reviewerName}'s reviews | ${SITE_NAME}`,
      description: `Browse ${reviewerName}'s Cape Town review activity and community contributions on Sayso.`,
      keywords: [reviewerName, 'reviewer profile', 'sayso'],
      url: id ? `/reviewer/${id}` : undefined,
      type: 'profile',
    }),

  review: (businessName: string, slug?: string): Metadata =>
    generateSEOMetadata({
      title: `Write a review for ${businessName} | ${SITE_NAME}`,
      description: `Write and publish a community review for ${businessName} on Sayso.`,
      keywords: [businessName, 'write review', 'sayso'],
      url: slug ? `/business/${slug}/review` : undefined,
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  category: (categoryName: string, slug?: string): Metadata =>
    generateSEOMetadata({
      title: `${categoryName} in Cape Town | ${SITE_NAME}`,
      description: `Discover top-rated ${categoryName.toLowerCase()} in Cape Town with hyper-local reviews on Sayso.`,
      keywords: [categoryName, 'cape town businesses', 'sayso'],
      url: slug ? `/categories/${slug}` : undefined,
      type: 'website',
    }),

  city: (cityName: string, slug?: string): Metadata =>
    generateSEOMetadata({
      title: `${cityName} business reviews | ${SITE_NAME}`,
      description: `Explore hyper-local reviews and discovery guides for ${cityName} on Sayso.`,
      keywords: [cityName, 'business reviews', 'sayso'],
      url: slug ? `/${slug}` : undefined,
      type: 'website',
    }),

  notifications: (): Metadata =>
    generateSEOMetadata({
      title: `Notifications | ${SITE_NAME}`,
      description: 'View your account notifications on Sayso.',
      keywords: ['notifications', 'sayso'],
      url: '/notifications',
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  achievements: (): Metadata =>
    generateSEOMetadata({
      title: `Achievements | ${SITE_NAME}`,
      description: 'Track your badges and milestones in the Sayso community.',
      keywords: ['achievements', 'badges', 'sayso'],
      url: '/achievements',
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  discoverReviews: (): Metadata =>
    generateSEOMetadata({
      title: `Cape Town community reviews | ${SITE_NAME}`,
      description: 'Read real Cape Town community reviews for local businesses on Sayso.',
      keywords: ['cape town community reviews', 'sayso reviews'],
      url: '/discover/reviews',
      type: 'website',
    }),

  writeReview: (): Metadata =>
    generateSEOMetadata({
      title: `Write a review | ${SITE_NAME}`,
      description: 'Write a hyper-local review and share your experience on Sayso.',
      keywords: ['write review', 'sayso'],
      url: '/write-review',
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  dm: (): Metadata =>
    generateSEOMetadata({
      title: `Messages | ${SITE_NAME}`,
      description: 'Read and send direct messages on Sayso.',
      keywords: ['messages', 'sayso'],
      url: '/dm',
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  settings: (): Metadata =>
    generateSEOMetadata({
      title: `Account settings | ${SITE_NAME}`,
      description: 'Manage your account settings and preferences in Sayso.',
      keywords: ['settings', 'sayso'],
      url: '/settings',
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  addBusiness: (): Metadata =>
    generateSEOMetadata({
      title: `Add a business | ${SITE_NAME}`,
      description: 'Submit a business listing to Sayso.',
      keywords: ['add business', 'sayso'],
      url: '/add-business',
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  claimBusiness: (): Metadata =>
    generateSEOMetadata({
      title: `Claim your business | ${SITE_NAME}`,
      description: 'Start or continue your business claim on Sayso.',
      keywords: ['claim business', 'sayso'],
      url: '/claim-business',
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  myBusinesses: (): Metadata =>
    generateSEOMetadata({
      title: `My businesses dashboard | ${SITE_NAME}`,
      description: 'Manage your verified businesses, events, and specials on Sayso.',
      keywords: ['my businesses', 'business dashboard', 'sayso'],
      url: '/my-businesses',
      noindex: true,
      nofollow: true,
      type: 'website',
    }),

  terms: (): Metadata =>
    generateSEOMetadata({
      title: `Terms of Service | ${SITE_NAME}`,
      description: 'Read the Sayso Terms of Service — the rules and guidelines for using our platform.',
      keywords: ['sayso terms of service', 'terms', 'legal'],
      url: '/terms',
      type: 'website',
    }),

  privacy: (): Metadata =>
    generateSEOMetadata({
      title: `Privacy Policy | ${SITE_NAME}`,
      description: 'Read the Sayso Privacy Policy to understand how we collect and use your data.',
      keywords: ['sayso privacy policy', 'privacy', 'data'],
      url: '/privacy',
      type: 'website',
    }),
};


