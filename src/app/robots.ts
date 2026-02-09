import { MetadataRoute } from 'next';

/**
 * Robots.txt Generator
 * Controls search engine crawler access
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sayso-nine.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
          '/dashboard/',
          '/test-',
          '/debug-',
          '/manage-business',
          '/my-businesses',
          '/settings',
          '/business/*/edit',
          '/business/*/review',
          '/dm/',
          '/profile',
          '/saved',
          '/write-review',
          '/verify-email',
          '/reset-password',
          '/forgot-password',
          '/onboarding',
          '/interests',
          '/subcategories',
          '/complete',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

