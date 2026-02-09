import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

/**
 * Dynamic XML Sitemap Generator
 * Generates sitemap with all static pages and dynamic business pages
 * 
 * Note: This sitemap is dynamic and uses direct Supabase connection
 * to avoid cookie dependencies during static generation
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sayso-nine.vercel.app';

// Force dynamic rendering for sitemap
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

// Create a direct Supabase client for sitemap (no cookies needed)
function getSitemapSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Static pages with their priorities and change frequencies
const staticPages = [
  {
    url: '/',
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 1.0,
  },
  {
    url: '/home',
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 1.0,
  },
  {
    url: '/explore',
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 0.9,
  },
  {
    url: '/for-you',
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 0.9,
  },
  {
    url: '/trending',
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 0.9,
  },
  {
    url: '/leaderboard',
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  },
  {
    url: '/events-specials',
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  },
  {
    url: '/discover/reviews',
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  },
];

/**
 * Fetch all businesses from the database for sitemap
 */
async function getBusinesses(): Promise<Array<{ slug: string; updated_at: string }>> {
  try {
    const supabase = getSitemapSupabase();
    
    // Fetch only active businesses with slugs
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('slug, updated_at, created_at, status')
      .eq('status', 'active')
      .or('is_system.is.null,is_system.eq.false')
      .not('slug', 'is', null)
      .limit(10000); // Limit to prevent sitemap from being too large

    if (error) {
      console.error('[Sitemap] Error fetching businesses:', error);
      return [];
    }

    if (!businesses) {
      return [];
    }

    // Map to sitemap format
    return businesses.map((business) => ({
      slug: business.slug,
      updated_at: business.updated_at || business.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[Sitemap] Error fetching businesses:', error);
    return [];
  }
}

/**
 * Get categories for sitemap
 */
async function getCategories(): Promise<Array<{ slug: string }>> {
  try {
    const supabase = getSitemapSupabase();
    
    // Get unique canonical category slugs
    const { data, error } = await supabase
      .from('businesses')
      .select('primary_category_slug')
      .eq('status', 'active')
      .or('is_system.is.null,is_system.eq.false')
      .not('primary_category_slug', 'is', null);
    
    if (error) {
      console.error('[Sitemap] Error fetching categories:', error);
      return [];
    }
    
    const uniqueCategories = [...new Set((data || []).map((b: any) => b.primary_category_slug).filter(Boolean))];
    return uniqueCategories.map((slug: string) => ({ slug }));
  } catch (error) {
    console.error('[Sitemap] Error fetching categories:', error);
    return [];
  }
}

/**
 * Get city-category combinations for sitemap
 * Returns URLs like /cape-town-restaurants, /parow-salons
 */
async function getCityCategorySlugs(): Promise<Array<{ slug: string }>> {
  try {
    const supabase = getSitemapSupabase();
    
    // Get unique location-category combinations
    const { data, error } = await supabase
      .from('businesses')
      .select('location, primary_subcategory_label')
      .eq('status', 'active')
      .or('is_system.is.null,is_system.eq.false')
      .not('location', 'is', null)
      .not('primary_subcategory_label', 'is', null)
      .limit(200); // Limit to prevent sitemap from being too large
    
    if (error) {
      console.error('[Sitemap] Error fetching city categories:', error);
      return [];
    }
    
    // Create unique city-category slugs
    const combinations = new Set<string>();
    (data || []).forEach((business: any) => {
      if (business.location && business.primary_subcategory_label) {
        const city = business.location.toLowerCase().replace(/\s+/g, '-');
        const category = String(business.primary_subcategory_label).toLowerCase().replace(/\s+/g, '-');
        // Generate common patterns like "cape-town-restaurants"
        combinations.add(`${city}-${category}`);
        // Also add "best" variations like "cape-town-best-food"
        if (category.includes('restaurant') || category.includes('food')) {
          combinations.add(`${city}-best-food`);
        }
      }
    });
    
    return Array.from(combinations).map((slug) => ({ slug }));
  } catch (error) {
    console.error('[Sitemap] Error fetching city categories:', error);
    return [];
  }
}

/**
 * Fetch events for sitemap
 */
async function getEvents(): Promise<Array<{ id: string; updated_at: string }>> {
  try {
    const supabase = getSitemapSupabase();

    const { data: events, error } = await supabase
      .from('ticketmaster_events')
      .select('id, updated_at, created_at')
      .limit(5000);

    if (error) {
      console.error('[Sitemap] Error fetching events:', error);
      return [];
    }

    return (events || []).map((event) => ({
      id: event.id,
      updated_at: event.updated_at || event.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[Sitemap] Error fetching events:', error);
    return [];
  }
}

/**
 * Fetch specials for sitemap
 */
async function getSpecials(): Promise<Array<{ id: string; updated_at: string }>> {
  try {
    const supabase = getSitemapSupabase();

    const { data: specials, error } = await supabase
      .from('events_and_specials')
      .select('id, updated_at, created_at')
      .eq('type', 'special')
      .limit(5000);

    if (error) {
      console.error('[Sitemap] Error fetching specials:', error);
      return [];
    }

    return (specials || []).map((special) => ({
      id: special.id,
      updated_at: special.updated_at || special.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[Sitemap] Error fetching specials:', error);
    return [];
  }
}

/**
 * Generate sitemap
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get all businesses, categories, city-category combinations, and events
  const [businesses, categories, cityCategorySlugs, events, specials] = await Promise.all([
    getBusinesses(),
    getCategories(),
    getCityCategorySlugs(),
    getEvents(),
    getSpecials(),
  ]);

  // Generate business URLs
  const businessUrls = businesses.map((business) => ({
    url: `${baseUrl}/business/${business.slug}`,
    lastModified: new Date(business.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Generate category URLs
  const categoryUrls = categories.map((category) => ({
    url: `${baseUrl}/category/${category.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  // Generate city-category URLs (like /cape-town-restaurants)
  const cityCategoryUrls = cityCategorySlugs.map(({ slug }) => ({
    url: `${baseUrl}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  // Generate event URLs
  const eventUrls = events.map((event) => ({
    url: `${baseUrl}/event/${event.id}`,
    lastModified: new Date(event.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Generate special URLs
  const specialUrls = specials.map((special) => ({
    url: `${baseUrl}/special/${special.id}`,
    lastModified: new Date(special.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Combine static and dynamic pages
  const allPages = [
    ...staticPages.map((page) => ({
      url: `${baseUrl}${page.url}`,
      lastModified: page.lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...businessUrls,
    ...categoryUrls,
    ...cityCategoryUrls,
    ...eventUrls,
    ...specialUrls,
  ];

  return allPages;
}

