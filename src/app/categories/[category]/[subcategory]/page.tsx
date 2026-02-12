import type { Metadata } from 'next';
import { getServerSupabase } from '../../../lib/supabase/server';
import { DEFAULT_SITE_DESCRIPTION, generateSEOMetadata, SITE_URL } from '../../../lib/utils/seoMetadata';
import { generateBreadcrumbSchema, generateCollectionPageSchema, generateItemListSchema } from '../../../lib/utils/schemaMarkup';
import { normalizeBusinessImages } from '../../../lib/utils/businessImages';
import CategoryPageClient from '../../../category/[slug]/CategoryPageClient';
import SchemaMarkup from '../../../components/SEO/SchemaMarkup';

interface CategorySubcategoryPageProps {
  params: Promise<{ category: string; subcategory: string }>;
}

function toTitleCaseFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function matchesSubcategory(business: any, subcategorySlug: string): boolean {
  const candidates = [
    business?.primary_subcategory_slug,
    business?.sub_interest_id,
    business?.subInterestId,
    business?.primary_subcategory_label ? toSlug(String(business.primary_subcategory_label)) : undefined,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return candidates.includes(subcategorySlug.toLowerCase());
}

export async function generateMetadata({ params }: CategorySubcategoryPageProps): Promise<Metadata> {
  const { category, subcategory } = await params;
  const categoryName = toTitleCaseFromSlug(category);
  const subcategoryName = toTitleCaseFromSlug(subcategory);

  let ogImage: string | undefined;
  try {
    const supabase = await getServerSupabase();
    const { data } = await supabase
      .from('businesses')
      .select('image_url, uploaded_images, business_images(url, is_primary, sort_order), primary_subcategory_slug, sub_interest_id, primary_subcategory_label')
      .eq('primary_category_slug', category)
      .eq('status', 'active')
      .or('is_system.is.null,is_system.eq.false')
      .limit(30);

    const match = (data || []).find((business) => matchesSubcategory(business, subcategory));
    if (match) {
      const businessImages = Array.isArray((match as any).business_images) ? (match as any).business_images : [];
      const orderedBusinessImages = [...businessImages].sort((a: any, b: any) => {
        if (a?.is_primary && !b?.is_primary) return -1;
        if (!a?.is_primary && b?.is_primary) return 1;
        return Number(a?.sort_order || 0) - Number(b?.sort_order || 0);
      });

      ogImage =
        (Array.isArray((match as any).uploaded_images) ? (match as any).uploaded_images[0] : undefined) ||
        orderedBusinessImages[0]?.url ||
        (match as any).image_url ||
        undefined;
    }
  } catch (error) {
    console.error('[Category/Subcategory Metadata] Failed to load OG image:', error);
  }

  return generateSEOMetadata({
    title: `${subcategoryName} in Cape Town | Sayso`,
    description: `Discover ${subcategoryName.toLowerCase()} in Cape Town under ${categoryName} on Sayso. ${DEFAULT_SITE_DESCRIPTION}`,
    keywords: [subcategoryName.toLowerCase(), categoryName.toLowerCase(), 'cape town business reviews', 'sayso'],
    image: ogImage,
    url: `/categories/${category}/${subcategory}`,
    type: 'website',
  });
}

export default async function CategorySubcategoryPage({ params }: CategorySubcategoryPageProps) {
  const { category, subcategory } = await params;
  const categoryName = toTitleCaseFromSlug(category);
  const subcategoryName = toTitleCaseFromSlug(subcategory);

  const supabase = await getServerSupabase();
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, name, slug, description, image_url, location, primary_category_slug, primary_subcategory_slug, primary_subcategory_label, sub_interest_id, average_rating:business_stats(average_rating), business_images(id, url, type, sort_order, is_primary)')
    .eq('primary_category_slug', category)
    .eq('status', 'active')
    .or('is_system.is.null,is_system.eq.false')
    .limit(100)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Category/Subcategory Page] Error fetching businesses:', error);
  }

  const filteredBusinesses = (businesses || []).filter((business) => matchesSubcategory(business, subcategory));

  const normalizedBusinesses = filteredBusinesses.map((business: any) => {
    const normalized = normalizeBusinessImages(business);
    return {
      ...business,
      uploaded_images: normalized.uploaded_images,
    };
  });

  const canonicalUrl = `${SITE_URL}/categories/${category}/${subcategory}`;
  const pageName = `${subcategoryName} in ${categoryName}`;

  const collectionSchema = generateCollectionPageSchema({
    name: pageName,
    description: `Discover ${subcategoryName.toLowerCase()} options in Cape Town with hyper-local community reviews.`,
    url: canonicalUrl,
  });

  const itemListSchema = generateItemListSchema(
    pageName,
    `Top ${subcategoryName.toLowerCase()} options in Cape Town.`,
    normalizedBusinesses.map((business: any) => ({
      name: business.name,
      url: `${SITE_URL}/business/${business.slug || business.id}`,
      image:
        (Array.isArray(business.uploaded_images) && business.uploaded_images.length > 0
          ? business.uploaded_images[0]
          : null) || business.image_url,
      rating: business.average_rating?.[0]?.average_rating || 0,
    }))
  );

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: `${SITE_URL}/home` },
    { name: categoryName, url: `${SITE_URL}/categories/${category}` },
    { name: subcategoryName, url: canonicalUrl },
  ]);

  return (
    <>
      <SchemaMarkup schemas={[collectionSchema, itemListSchema, breadcrumbSchema]} />
      <CategoryPageClient
        categoryName={pageName}
        categorySlug={`${category}/${subcategory}`}
        businesses={normalizedBusinesses}
      />
    </>
  );
}
