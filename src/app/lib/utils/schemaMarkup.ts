/**
 * Schema.org Structured Data Generator
 * Generates JSON-LD schema markup for SEO and rich results
 */

import { SITE_NAME, SITE_URL } from './seoMetadata';

export interface BusinessSchema {
  name: string;
  description: string;
  image?: string;
  url: string;
  telephone?: string;
  email?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  priceRange?: string;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
  openingHours?: string[];
  servesCuisine?: string;
  category?: string;
}

export interface ReviewSchema {
  author: string;
  ratingValue: number;
  reviewBody: string;
  datePublished: string;
}

/**
 * Generate LocalBusiness schema markup
 */
export function generateLocalBusinessSchema(business: BusinessSchema): object {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.description,
    url: business.url,
  };

  if (business.image) {
    schema.image = business.image;
  }

  if (business.telephone) {
    schema.telephone = business.telephone;
  }

  if (business.email) {
    schema.email = business.email;
  }

  if (business.address) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: business.address.streetAddress,
      addressLocality: business.address.addressLocality,
      ...(business.address.addressRegion && { addressRegion: business.address.addressRegion }),
      ...(business.address.postalCode && { postalCode: business.address.postalCode }),
      addressCountry: business.address.addressCountry || 'ZA',
    };
  }

  if (business.geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: business.geo.latitude,
      longitude: business.geo.longitude,
    };
  }

  if (business.priceRange) {
    schema.priceRange = business.priceRange;
  }

  if (business.aggregateRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: business.aggregateRating.ratingValue,
      reviewCount: business.aggregateRating.reviewCount,
      bestRating: business.aggregateRating.bestRating || 5,
      worstRating: business.aggregateRating.worstRating || 1,
    };
  }

  if (business.openingHours && business.openingHours.length > 0) {
    schema.openingHoursSpecification = business.openingHours.map((hours) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: parseDayOfWeek(hours),
      opens: parseOpens(hours),
      closes: parseCloses(hours),
    }));
  }

  if (business.servesCuisine) {
    schema.servesCuisine = business.servesCuisine;
  }

  if (business.category) {
    // Map category to Schema.org types
    const categoryMap: Record<string, string> = {
      'Restaurant': 'Restaurant',
      'Cafe': 'CafeOrCoffeeShop',
      'Bar': 'BarOrPub',
      'Beauty': 'BeautySalon',
      'Spa': 'HealthAndBeautyBusiness',
      'Gym': 'ExerciseGym',
      'Salon': 'BeautySalon',
      'Store': 'Store',
      'Service': 'LocalBusiness',
    };
    schema['@type'] = categoryMap[business.category] || 'LocalBusiness';
  }

  return schema;
}

/**
 * Generate Review schema markup
 */
export function generateReviewSchema(reviews: ReviewSchema[]): object[] {
  return reviews.map((review) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: review.author,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.ratingValue,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: review.reviewBody,
    datePublished: review.datePublished,
  }));
}

/**
 * Generate BreadcrumbList schema markup
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate Organization schema for the site
 */
export function generateOrganizationSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logos/logo.png`,
    sameAs: [
      // Add social media links here when available
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: ['English'],
    },
  };
}

/**
 * Generate ItemList schema for category/area pages
 */
export function generateItemListSchema(
  name: string,
  description: string,
  items: Array<{ name: string; url: string; image?: string; rating?: number }>
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
      ...(item.image && { image: item.image }),
      ...(item.rating && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: item.rating,
          bestRating: 5,
          worstRating: 1,
        },
      }),
    })),
  };
}

/**
 * Helper functions for parsing opening hours
 */
function parseDayOfWeek(hours: string): string {
  // Expected format: "Monday 09:00-17:00" or "Mo-Fr 09:00-17:00"
  const dayMatch = hours.match(/^([A-Za-z]+(?:\-[A-Za-z]+)?)/);
  if (!dayMatch) return 'Monday';
  
  const day = dayMatch[1];
  const dayMap: Record<string, string> = {
    'Mo': 'Monday',
    'Tu': 'Tuesday',
    'We': 'Wednesday',
    'Th': 'Thursday',
    'Fr': 'Friday',
    'Sa': 'Saturday',
    'Su': 'Sunday',
  };
  
  return dayMap[day] || day;
}

function parseOpens(hours: string): string {
  const timeMatch = hours.match(/(\d{2}:\d{2})/);
  return timeMatch ? timeMatch[1] : '09:00';
}

function parseCloses(hours: string): string {
  const timeMatches = hours.match(/(\d{2}:\d{2})/g);
  return timeMatches && timeMatches.length > 1 ? timeMatches[1] : '17:00';
}

/**
 * Generate WebSite schema with SearchAction for Google sitelinks search box
 */
export function generateWebSiteSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generate CollectionPage schema markup for category/listing pages.
 */
export function generateCollectionPageSchema({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

/**
 * Generate complete schema markup for a business page
 */
export function generateBusinessPageSchema(
  business: BusinessSchema,
  reviews: ReviewSchema[],
  breadcrumbs: Array<{ name: string; url: string }>
): object[] {
  const schemas: object[] = [
    generateLocalBusinessSchema(business),
    generateBreadcrumbSchema(breadcrumbs),
  ];

  if (reviews.length > 0) {
    schemas.push(...generateReviewSchema(reviews));
  }

  return schemas;
}

