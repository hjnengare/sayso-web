import { Metadata } from 'next';
import { getServerSupabase } from '../../lib/supabase/server';
import { DEFAULT_SITE_DESCRIPTION, generateSEOMetadata, SITE_URL } from '../../lib/utils/seoMetadata';
import SchemaMarkup from '../../components/SEO/SchemaMarkup';
import { generateLocalBusinessSchema, generateBreadcrumbSchema, generateReviewSchema } from '../../lib/utils/schemaMarkup';
import Link from 'next/link';

interface BusinessLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Generate dynamic metadata for business pages
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  let business: any = null;
  let actualId: string = id;
  
  try {
    const supabase = await getServerSupabase();
    
    // Try slug first, then ID
    // Try by slug
    const { data: slugData } = await supabase
      .from('businesses')
      .select('id, slug')
      .eq('slug', id)
      .eq('status', 'active')
      .or('is_system.is.null,is_system.eq.false')
      .single();
    
    actualId = slugData?.id || id;
    
    // Fetch business data
    const { data } = await supabase
      .from('businesses')
      .select('name, description, image_url, uploaded_images, business_images(url, is_primary, sort_order), slug, category, primary_category_slug, primary_category_label, business_stats(average_rating, total_reviews)')
      .eq('id', actualId)
      .eq('status', 'active')
      .or('is_system.is.null,is_system.eq.false')
      .single();
    
    if (data) {
      business = data;
    }
  } catch (error) {
    console.error('[Business Metadata] Error fetching business:', error);
  }

  if (!business) {
    return generateSEOMetadata({
      title: 'Business details | Sayso',
      description: DEFAULT_SITE_DESCRIPTION,
      url: `/business/${id}`,
      noindex: true,
      nofollow: true,
    });
  }

  const businessSlug = business.slug || id;
  const categoryLabel = business.primary_category_label || business.category || '';
  const stats = (business as any).business_stats?.[0] ?? null;
  const rating: number | null = stats?.average_rating ?? null;
  const reviewCount: number = stats?.total_reviews ?? 0;
  const ratingStr = rating !== null
    ? `${rating.toFixed(1)} ★ · ${reviewCount} review${reviewCount !== 1 ? 's' : ''} · `
    : '';
  const description =
    `${ratingStr}${categoryLabel ? `${categoryLabel} in Cape Town. ` : ''}${business.description ?? ''}`.trim() ||
    `${business.name} on Sayso. Hyper-local reviews, ratings, and discovery details for Cape Town locals.`;

  return generateSEOMetadata({
    title: `${business.name} reviews in Cape Town | Sayso`,
    description,
    keywords: [business.name, 'sayso reviews', 'cape town business reviews', categoryLabel],
    image: `${SITE_URL}/api/og/business/${id}`,
    url: `/business/${businessSlug}`,
    type: 'article',
  });
}

export default async function BusinessLayout({
  children,
  params,
}: BusinessLayoutProps) {
  const { id } = await params;
  
  // Fetch business data for schema
  let schemas: any[] = [];
  let relatedLinks: Array<{ href: string; label: string }> = [];
  try {
    const supabase = await getServerSupabase();
    
    // Try slug first, then ID
    const { data: slugData } = await supabase
      .from('businesses')
      .select('id, slug')
      .eq('slug', id)
      .eq('status', 'active')
      .or('is_system.is.null,is_system.eq.false')
      .single();
    
    const actualId = slugData?.id || id;
    
    const { data: business } = await supabase
      .from('businesses')
      .select(`
        name,
        description,
        image_url,
        uploaded_images,
        slug,
        category,
        primary_category_slug,
        primary_category_label,
        phone,
        email,
        address,
        location,
        latitude,
        longitude,
        price_range,
        business_stats(average_rating, total_reviews)
      `)
      .eq('id', actualId)
      .eq('status', 'active')
      .or('is_system.is.null,is_system.eq.false')
      .single();

    // Fetch up to 5 most helpful reviews for Review schema (rich results)
    const { data: reviewRows } = await supabase
      .from('reviews')
      .select('rating, content, created_at, profiles(username)')
      .eq('business_id', actualId)
      .not('content', 'is', null)
      .order('helpful_count', { ascending: false })
      .limit(5);

    if (business) {
      const businessSlug = business.slug || id;
      const categoryLabel = business.primary_category_label || business.category || 'Business';
      const categorySlug = business.primary_category_slug || toSlug(categoryLabel);
      const citySlug = business.location
        ? toSlug(String(business.location).split(',')[0])
        : '';
      
      // Generate LocalBusiness schema
      const businessSchema = generateLocalBusinessSchema({
        name: business.name,
        description: business.description || `${categoryLabel} located in ${business.location || 'Cape Town'}`,
        image: (business.uploaded_images && business.uploaded_images.length > 0 ? business.uploaded_images[0] : null) || business.image_url || undefined,
        url: `${SITE_URL}/business/${businessSlug}`,
        telephone: business.phone || undefined,
        email: business.email || undefined,
        address: business.address ? {
          streetAddress: business.address.split(',')[0] || business.address,
          addressLocality: business.location || 'Cape Town',
          addressCountry: 'ZA',
        } : undefined,
        geo: business.latitude != null && business.longitude != null ? {
          latitude: business.latitude,
          longitude: business.longitude,
        } : undefined,
        priceRange: business.price_range || undefined,
        aggregateRating: business.business_stats?.[0]?.average_rating && (business.business_stats?.[0]?.total_reviews || 0) > 0 ? {
          ratingValue: business.business_stats[0].average_rating,
          reviewCount: business.business_stats[0].total_reviews || 0,
          bestRating: 5,
          worstRating: 1,
        } : undefined,
        category: categoryLabel || undefined,
      });
      
      // Generate Breadcrumb schema
      const breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Home', url: `${SITE_URL}/home` },
        { name: categoryLabel, url: `${SITE_URL}/categories/${categorySlug}` },
        { name: business.name, url: `${SITE_URL}/business/${businessSlug}` },
      ]);
      
      // Generate Review schemas for rich results
      const reviewSchemas = reviewRows && reviewRows.length > 0
        ? generateReviewSchema(
            reviewRows
              .filter((r: any) => r.rating && r.content)
              .map((r: any) => ({
                author: (r.profiles as any)?.username || 'Sayso User',
                ratingValue: r.rating,
                reviewBody: r.content,
                datePublished: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '',
              }))
          )
        : [];

      schemas = [businessSchema, breadcrumbSchema, ...reviewSchemas];
      relatedLinks = [
        { href: `/categories/${categorySlug}`, label: `More in ${categoryLabel}` },
        ...(citySlug ? [{ href: `/${citySlug}`, label: `More in ${business.location}` }] : []),
      ];
    }
  } catch (error) {
    console.error('[Business Layout] Error generating schema:', error);
  }

  return (
    <>
      {schemas.length > 0 && <SchemaMarkup schemas={schemas} />}
      {relatedLinks.length > 0 && (
        <nav aria-label="Related links" className="sr-only">
          <ul>
            {relatedLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {children}
    </>
  );
}

