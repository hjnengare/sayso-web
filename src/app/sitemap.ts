import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SITE_URL } from './lib/utils/seoMetadata';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const MAX_ROWS = 10000;

function getSitemapSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const staticPublicPages: Array<{
  url: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { url: '/home', priority: 1.0, changeFrequency: 'daily' },
  { url: '/search', priority: 0.9, changeFrequency: 'daily' },
  { url: '/events', priority: 0.9, changeFrequency: 'daily' },
  { url: '/leaderboard', priority: 0.8, changeFrequency: 'daily' },
  { url: '/discover/reviews', priority: 0.7, changeFrequency: 'daily' },
];

async function getBusinesses(): Promise<Array<{ slug: string; updated_at: string | null; created_at: string | null }>> {
  try {
    const supabase = getSitemapSupabase();
    const { data, error } = await supabase
      .from('businesses')
      .select('slug, updated_at, created_at')
      .eq('status', 'active')
      .or('is_system.is.null,is_system.eq.false')
      .not('slug', 'is', null)
      .limit(MAX_ROWS);

    if (error) {
      console.error('[Sitemap] Error fetching businesses:', error);
      return [];
    }

    return (data || []) as Array<{ slug: string; updated_at: string | null; created_at: string | null }>;
  } catch (error) {
    console.error('[Sitemap] Unexpected business fetch error:', error);
    return [];
  }
}

async function getCategoriesAndSubcategories(): Promise<
  Array<{
    primary_category_slug: string | null;
    primary_subcategory_slug: string | null;
    updated_at: string | null;
    created_at: string | null;
  }>
> {
  try {
    const supabase = getSitemapSupabase();
    const { data, error } = await supabase
      .from('businesses')
      .select('primary_category_slug, primary_subcategory_slug, updated_at, created_at')
      .eq('status', 'active')
      .or('is_system.is.null,is_system.eq.false')
      .limit(MAX_ROWS);

    if (error) {
      console.error('[Sitemap] Error fetching categories/subcategories:', error);
      return [];
    }

    return (data || []) as Array<{
      primary_category_slug: string | null;
      primary_subcategory_slug: string | null;
      updated_at: string | null;
      created_at: string | null;
    }>;
  } catch (error) {
    console.error('[Sitemap] Unexpected category fetch error:', error);
    return [];
  }
}

async function getCityLongTailSlugs(): Promise<Array<{ slug: string; updated_at: string | null; created_at: string | null }>> {
  try {
    const supabase = getSitemapSupabase();
    const { data, error } = await supabase
      .from('businesses')
      .select('location, primary_subcategory_label, updated_at, created_at')
      .eq('status', 'active')
      .or('is_system.is.null,is_system.eq.false')
      .not('location', 'is', null)
      .not('primary_subcategory_label', 'is', null)
      .limit(2000);

    if (error) {
      console.error('[Sitemap] Error fetching city long-tail slugs:', error);
      return [];
    }

    const toSlug = (value: string) =>
      value
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

    const map = new Map<string, { updated_at: string | null; created_at: string | null }>();

    for (const row of data || []) {
      const location = typeof row.location === 'string' ? row.location : '';
      const category = typeof row.primary_subcategory_label === 'string' ? row.primary_subcategory_label : '';
      const city = location.split(',')[0]?.trim();

      if (!city || !category) continue;

      const citySlug = toSlug(city);
      const categorySlug = toSlug(category);
      if (!citySlug || !categorySlug) continue;

      const slug = `${citySlug}-${categorySlug}`;
      const existing = map.get(slug);
      if (!existing) {
        map.set(slug, {
          updated_at: row.updated_at || null,
          created_at: row.created_at || null,
        });
      }
    }

    return Array.from(map.entries()).map(([slug, dates]) => ({
      slug,
      updated_at: dates.updated_at,
      created_at: dates.created_at,
    }));
  } catch (error) {
    console.error('[Sitemap] Unexpected city slug fetch error:', error);
    return [];
  }
}

async function getEvents(): Promise<Array<{ id: string; updated_at: string | null; created_at: string | null }>> {
  try {
    const supabase = getSitemapSupabase();

    const { data, error } = await supabase
      .from('events_and_specials')
      .select('id, updated_at, created_at')
      .eq('type', 'event')
      .limit(5000);

    if (error) {
      console.error('[Sitemap] Error fetching events:', error);
      return [];
    }

    return (data || []) as Array<{ id: string; updated_at: string | null; created_at: string | null }>;
  } catch (error) {
    console.error('[Sitemap] Unexpected event fetch error:', error);
    return [];
  }
}

async function getPublicProfiles(): Promise<Array<{ username: string; updated_at: string | null; created_at: string | null }>> {
  try {
    const supabase = getSitemapSupabase();

    const { data, error } = await supabase
      .from('profiles')
      .select('username, updated_at, created_at, reviews_count')
      .not('username', 'is', null)
      .gt('reviews_count', 0)
      .limit(5000);

    if (error) {
      console.error('[Sitemap] Error fetching public profiles:', error);
      return [];
    }

    return (data || [])
      .filter((row: any) => typeof row.username === 'string' && row.username.trim().length > 0)
      .map((row: any) => ({
        username: String(row.username).toLowerCase(),
        updated_at: row.updated_at || null,
        created_at: row.created_at || null,
      }));
  } catch (error) {
    console.error('[Sitemap] Unexpected profile fetch error:', error);
    return [];
  }
}

function toDate(value?: string | null): Date {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [businesses, categoryRows, events, citySlugs, profiles] = await Promise.all([
    getBusinesses(),
    getCategoriesAndSubcategories(),
    getEvents(),
    getCityLongTailSlugs(),
    getPublicProfiles(),
  ]);

  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = staticPublicPages.map((page) => ({
    url: `${SITE_URL}${page.url}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const businessUrls: MetadataRoute.Sitemap = businesses.map((business) => ({
    url: `${SITE_URL}/business/${business.slug}`,
    lastModified: toDate(business.updated_at || business.created_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryMap = new Map<string, Date>();
  const subcategoryMap = new Map<string, Date>();

  for (const row of categoryRows) {
    const lastModified = toDate(row.updated_at || row.created_at);

    if (row.primary_category_slug) {
      const categoryPath = `/categories/${row.primary_category_slug}`;
      const existing = categoryMap.get(categoryPath);
      if (!existing || existing < lastModified) {
        categoryMap.set(categoryPath, lastModified);
      }
    }

    if (row.primary_category_slug && row.primary_subcategory_slug) {
      const subcategoryPath = `/categories/${row.primary_category_slug}/${row.primary_subcategory_slug}`;
      const existing = subcategoryMap.get(subcategoryPath);
      if (!existing || existing < lastModified) {
        subcategoryMap.set(subcategoryPath, lastModified);
      }
    }
  }

  const categoryUrls: MetadataRoute.Sitemap = Array.from(categoryMap.entries()).map(([path, lastModified]) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: 'daily',
    priority: 0.75,
  }));

  const subcategoryUrls: MetadataRoute.Sitemap = Array.from(subcategoryMap.entries()).map(([path, lastModified]) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const eventUrls: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${SITE_URL}/event/${event.id}`,
    lastModified: toDate(event.updated_at || event.created_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const cityUrls: MetadataRoute.Sitemap = citySlugs.map((row) => ({
    url: `${SITE_URL}/${row.slug}`,
    lastModified: toDate(row.updated_at || row.created_at),
    changeFrequency: 'daily',
    priority: 0.65,
  }));

  const profileUrls: MetadataRoute.Sitemap = profiles.map((profile) => ({
    url: `${SITE_URL}/profile/${profile.username}`,
    lastModified: toDate(profile.updated_at || profile.created_at),
    changeFrequency: 'weekly',
    priority: 0.55,
  }));

  return [
    ...staticUrls,
    ...categoryUrls,
    ...subcategoryUrls,
    ...businessUrls,
    ...eventUrls,
    ...cityUrls,
    ...profileUrls,
  ];
}

