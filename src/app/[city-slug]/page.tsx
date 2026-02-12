import { Metadata } from 'next';
import { getServerSupabase } from '../lib/supabase/server';
import { DEFAULT_SITE_DESCRIPTION, generateSEOMetadata, SITE_URL } from '../lib/utils/seoMetadata';
import { generateBreadcrumbSchema, generateCollectionPageSchema, generateItemListSchema } from '../lib/utils/schemaMarkup';
import { normalizeBusinessImages } from '../lib/utils/businessImages';
import CityPageClient from './CityPageClient';
import SchemaMarkup from '../components/SEO/SchemaMarkup';

interface CityPageProps {
  params: Promise<{ 'city-slug': string }>;
}

// Common city/category patterns
const CITY_CATEGORY_PATTERNS = [
  { pattern: /^(.+)-restaurants?$/i, category: 'Restaurant' },
  { pattern: /^(.+)-cafes?$/i, category: 'Cafe' },
  { pattern: /^(.+)-salons?$/i, category: 'Salon' },
  { pattern: /^(.+)-gyms?$/i, category: 'Gym' },
  { pattern: /^(.+)-spas?$/i, category: 'Spa' },
  { pattern: /^(.+)-bars?$/i, category: 'Bar' },
  { pattern: /^(.+)-shops?$/i, category: 'Shop' },
  { pattern: /^(.+)-best-food$/i, category: 'Restaurant' },
];

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { 'city-slug': slug } = await params;
  
  // Try to match city-category pattern
  let cityName = slug;
  let categoryName: string | undefined;
  
  for (const { pattern, category } of CITY_CATEGORY_PATTERNS) {
    const match = slug.match(pattern);
    if (match) {
      cityName = match[1];
      categoryName = category;
      break;
    }
  }
  
  const displayCityName = cityName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  const title = categoryName
    ? `Best ${categoryName}s in ${displayCityName} | Sayso`
    : `${displayCityName} business reviews | Sayso`;
  const description = categoryName
    ? `Find top ${categoryName.toLowerCase()} options in ${displayCityName} on Sayso. ${DEFAULT_SITE_DESCRIPTION}`
    : `Discover the best local businesses in ${displayCityName} with Sayso's hyper-local community reviews.`;

  return generateSEOMetadata({
    title,
    description,
    keywords: [displayCityName, categoryName?.toLowerCase() || 'businesses', 'cape town reviews', 'sayso'],
    url: `/${slug}`,
    type: 'website',
  });
}

export default async function CityPage({ params }: CityPageProps) {
  const { 'city-slug': slug } = await params;
  
  // Try to match city-category pattern
  let cityName = slug;
  let categoryName: string | undefined;
  
  for (const { pattern, category } of CITY_CATEGORY_PATTERNS) {
    const match = slug.match(pattern);
    if (match) {
      cityName = match[1];
      categoryName = category;
      break;
    }
  }
  
  const displayCityName = cityName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  // Fetch businesses
  const supabase = await getServerSupabase();
  let query = supabase
    .from('businesses')
    .select('id, name, slug, description, image_url, location, primary_subcategory_slug, primary_subcategory_label, average_rating:business_stats(average_rating), business_images(id, url, type, sort_order, is_primary)')
    .ilike('location', `%${displayCityName}%`)
    .eq('status', 'active')
    .or('is_system.is.null,is_system.eq.false');
  
  if (categoryName) {
    query = query.ilike('primary_subcategory_label', `%${categoryName}%`);
  }
  
  const { data: businesses, error } = await query
    .limit(50)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[City Page] Error fetching businesses:', error);
  }

  // Normalize business_images to uploaded_images format for backward compatibility
  const normalizedBusinesses = (businesses || []).map((business: any) => {
    const normalized = normalizeBusinessImages(business);
    return {
      ...business,
      uploaded_images: normalized.uploaded_images,
    };
  });

  const canonicalUrl = `${SITE_URL}/${slug}`;
  
  // Generate ItemList schema
  const itemListSchema = generateItemListSchema(
    categoryName ? `Best ${categoryName}s in ${displayCityName}` : `Best Businesses in ${displayCityName}`,
    `Discover the top-rated ${categoryName?.toLowerCase() || 'businesses'} in ${displayCityName}.`,
    normalizedBusinesses.map((business: any) => ({
      name: business.name,
      url: `${SITE_URL}/business/${business.slug || business.id}`,
      image: (business.uploaded_images && business.uploaded_images.length > 0 ? business.uploaded_images[0] : null) || business.image_url,
      rating: business.average_rating?.[0]?.average_rating || 0,
    }))
  );

  const collectionSchema = generateCollectionPageSchema({
    name: categoryName ? `Best ${categoryName}s in ${displayCityName}` : `${displayCityName} businesses`,
    description: `Hyper-local discovery and community reviews for ${displayCityName}.`,
    url: canonicalUrl,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: `${SITE_URL}/home` },
    { name: displayCityName, url: canonicalUrl },
  ]);

  return (
    <>
      <SchemaMarkup schemas={[collectionSchema, itemListSchema, breadcrumbSchema]} />
      <CityPageClient 
        cityName={displayCityName}
        categoryName={categoryName}
        citySlug={slug}
        businesses={normalizedBusinesses}
      />
    </>
  );
}

