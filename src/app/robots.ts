import { MetadataRoute } from 'next';
import { SITE_URL } from './lib/utils/seoMetadata';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
          '/my-businesses',
          '/claim-business',
          '/business/claim',
          '/settings',
          '/dm',
          '/saved',
          '/write-review',
          '/verify-email',
          '/reset-password',
          '/forgot-password',
          '/login',
          '/register',
          '/onboarding',
          '/interests',
          '/subcategories',
          '/deal-breakers',
          '/complete',
          '/notifications',
          '/add-business',
          '/add-event',
          '/add-special',
          '/business/*/edit',
          '/business/*/review',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

