import { Metadata } from 'next';
import { generateSEOMetadata } from '../../lib/utils/seoMetadata';
import { createClient } from '@supabase/supabase-js';

interface SpecialLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

/**
 * Fetch special data for metadata generation
 */
async function getSpecial(id: string) {
  try {
    // Use direct Supabase client for server-side metadata generation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: special, error } = await supabase
      .from('events_and_specials')
      .select(`
        id,
        title,
        description,
        image,
        type,
        businesses:business_id (
          name
        )
      `)
      .eq('id', id)
      .eq('type', 'special')
      .single();

    if (error || !special) {
      return null;
    }

    return special;
  } catch (error) {
    console.error('Error fetching special for metadata:', error);
    return null;
  }
}

/**
 * Generate dynamic metadata for special pages
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  const special = await getSpecial(id);

  if (!special) {
    return generateSEOMetadata({
      title: 'Special',
      description: 'View special offer details and information.',
      url: `/special/${id}`,
    });
  }

  const businessName = (special.businesses as any)?.name;
  const description = special.description
    || `Discover ${special.title}${businessName ? ` at ${businessName}` : ''} - special offer details and information.`;

  return generateSEOMetadata({
    title: special.title,
    description,
    keywords: [special.title, 'special', 'offer', 'promotion', businessName].filter(Boolean) as string[],
    image: special.image,
    url: `/special/${id}`,
    type: 'article',
  });
}

export default async function SpecialLayout({
  children,
}: SpecialLayoutProps) {
  return <>{children}</>;
}

