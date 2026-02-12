import { Metadata } from 'next';
import { getServerSupabase } from '../../lib/supabase/server';
import { DEFAULT_SITE_DESCRIPTION, generateSEOMetadata, SITE_URL } from '../../lib/utils/seoMetadata';
import {
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
  generateItemListSchema,
  generateOrganizationSchema,
} from '../../lib/utils/schemaMarkup';
import { normalizeBusinessImages } from '../../lib/utils/businessImages';
import CategoryPageClient from './CategoryPageClient';
import SchemaMarkup from '../../components/SEO/SchemaMarkup';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

// Category slug to display name mapping
const CATEGORY_MAP: Record<string, string> = {
  'food-drink': 'Food & Drink',
  'beauty-wellness': 'Beauty & Wellness',
  'professional-services': 'Professional Services',
  travel: 'Travel',
  'outdoors-adventure': 'Outdoors & Adventure',
  'experiences-entertainment': 'Entertainment & Experiences',
  'arts-culture': 'Arts & Culture',
  'family-pets': 'Family & Pets',
  'shopping-lifestyle': 'Shopping & Lifestyle',
};

function toTitleCaseFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function getCategoryOgImage(slug: string): Promise<string | undefined> {
  try {
    const supabase = await getServerSupabase();
    const { data } = await supabase
      .from('businesses')
      .select('image_url, uploaded_images, business_images(url, is_primary, sort_order)')
      .eq('primary_category_slug', slug)
      .eq('status', 'active')
      .or('is_system.is.null,is_system.eq.false')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return undefined;

    const businessImages = Array.isArray((data as any).business_images) ? (data as any).business_images : [];
    const orderedBusinessImages = [...businessImages].sort((a: any, b: any) => {
      if (a?.is_primary && !b?.is_primary) return -1;
      if (!a?.is_primary && b?.is_primary) return 1;
      return Number(a?.sort_order || 0) - Number(b?.sort_order || 0);
    });

    return (
      (Array.isArray((data as any).uploaded_images) ? (data as any).uploaded_images[0] : undefined) ||
      orderedBusinessImages[0]?.url ||
      (data as any).image_url ||
      undefined
    );
  } catch (error) {
    console.error('[Category Metadata] Failed to load category OG image:', error);
    return undefined;
  }
}

// Generate metadata for category page
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const categoryName = CATEGORY_MAP[slug] || toTitleCaseFromSlug(slug);
  const ogImage = await getCategoryOgImage(slug);

  return generateSEOMetadata({
    title: `${categoryName} in Cape Town | Sayso`,
    description: `Discover ${categoryName.toLowerCase()} in Cape Town on Sayso. ${DEFAULT_SITE_DESCRIPTION}`,
    keywords: [categoryName.toLowerCase(), 'cape town businesses', 'cape town reviews', 'sayso'],
    image: ogImage,
    url: `/categories/${slug}`,
    type: 'website',
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const categoryName = CATEGORY_MAP[slug] || toTitleCaseFromSlug(slug);

  // Fetch businesses in this category
  const supabase = await getServerSupabase();
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, name, slug, description, image_url, location, primary_category_slug, average_rating:business_stats(average_rating), business_images(id, url, type, sort_order, is_primary)')
    .eq('primary_category_slug', slug)
    .eq('status', 'active')
    .or('is_system.is.null,is_system.eq.false')
    .limit(50)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Category Page] Error fetching businesses:', error);
  }

  // Normalize business_images to uploaded_images format for backward compatibility
  const normalizedBusinesses = (businesses || []).map((business: any) => {
    const normalized = normalizeBusinessImages(business);
    return {
      ...business,
      uploaded_images: normalized.uploaded_images,
    };
  });

  const canonicalUrl = `${SITE_URL}/categories/${slug}`;
  
  // Generate ItemList schema for category page
  const itemListSchema = generateItemListSchema(
    `${categoryName} Businesses`,
    `Discover the best ${categoryName.toLowerCase()} businesses in your area.`,
    normalizedBusinesses.map((business: any) => ({
      name: business.name,
      url: `${SITE_URL}/business/${business.slug || business.id}`,
      image: (business.uploaded_images && business.uploaded_images.length > 0 ? business.uploaded_images[0] : null) || business.image_url,
      rating: business.average_rating?.[0]?.average_rating || 0,
    }))
  );

  const collectionSchema = generateCollectionPageSchema({
    name: `${categoryName} in Cape Town`,
    description: `Discover ${categoryName.toLowerCase()} in Cape Town with hyper-local community reviews.`,
    url: canonicalUrl,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: `${SITE_URL}/home` },
    { name: 'Categories', url: `${SITE_URL}/categories/${slug}` },
    { name: categoryName, url: canonicalUrl },
  ]);

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <SchemaMarkup schemas={[collectionSchema, itemListSchema, breadcrumbSchema, organizationSchema]} />
      <CategoryPageClient 
        categoryName={categoryName}
        categorySlug={slug}
        businesses={normalizedBusinesses}
      />
    </>
  );
}

