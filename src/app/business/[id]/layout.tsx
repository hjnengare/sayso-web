import { Metadata } from 'next';
import { getServerSupabase } from '../../lib/supabase/server';
import { generateSEOMetadata } from '../../lib/utils/seoMetadata';
import SchemaMarkup from '../../components/SEO/SchemaMarkup';
import { generateLocalBusinessSchema, generateBreadcrumbSchema } from '../../lib/utils/schemaMarkup';
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
    
    const actualId = slugData?.id || id;
    
    // Fetch business data
    const { data } = await supabase
      .from('businesses')
      .select('name, description, image_url, uploaded_images, slug, category, primary_category_slug, primary_category_label')
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
      title: 'Business',
      description: 'View business details, reviews, and information.',
      url: `/business/${id}`,
    });
  }

  const businessSlug = business.slug || id;
  const categoryLabel = business.primary_category_label || business.category || '';
  const image = (business.uploaded_images && business.uploaded_images.length > 0 ? business.uploaded_images[0] : null) || business.image_url || undefined;
  const description = business.description || `Discover ${business.name} - read reviews, view photos, and get all the information you need.`;

  return generateSEOMetadata({
    title: business.name,
    description,
    keywords: [business.name, 'business', 'reviews', 'local business', categoryLabel],
    image,
    url: `/business/${businessSlug}`,
    type: 'article',
  });
}

export default async function BusinessLayout({
  children,
  params,
}: BusinessLayoutProps) {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sayso-nine.vercel.app';
  
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
        url: `${baseUrl}/business/${businessSlug}`,
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
        aggregateRating: business.business_stats?.[0]?.average_rating ? {
          ratingValue: business.business_stats[0].average_rating,
          reviewCount: business.business_stats[0].total_reviews || 0,
          bestRating: 5,
          worstRating: 1,
        } : undefined,
        category: categoryLabel || undefined,
      });
      
      // Generate Breadcrumb schema
      const breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Home', url: `${baseUrl}/home` },
        { name: categoryLabel, url: `${baseUrl}/category/${categorySlug}` },
        { name: business.name, url: `${baseUrl}/business/${businessSlug}` },
      ]);
      
      schemas = [businessSchema, breadcrumbSchema];
      relatedLinks = [
        { href: `/category/${categorySlug}`, label: `More in ${categoryLabel}` },
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

