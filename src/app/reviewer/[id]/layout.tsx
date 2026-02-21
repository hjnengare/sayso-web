import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { generateSEOMetadata, SITE_URL } from '../../lib/utils/seoMetadata';
import SchemaMarkup from '../../components/SEO/SchemaMarkup';
import { generatePersonSchema, generateBreadcrumbSchema } from '../../lib/utils/schemaMarkup';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function getReviewerProfile(id: string) {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url, reviews_count, bio')
      .eq('user_id', id)
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const profile = await getReviewerProfile(id);

  if (profile) {
    const name = profile.display_name || profile.username || 'Reviewer';
    const reviewCount = profile.reviews_count || 0;
    const canonicalPath = `/reviewer/${id}`;

    return generateSEOMetadata({
      title: `${name}'s Cape Town reviews | Sayso`,
      description: `${name} has written ${reviewCount} review${reviewCount !== 1 ? 's' : ''} on Sayso, Cape Town's hyper-local reviews and discovery app.`,
      keywords: [name, 'reviewer profile', 'cape town reviews', 'sayso community'],
      image: profile.avatar_url || undefined,
      url: canonicalPath,
      type: 'profile',
    });
  }

  return generateSEOMetadata({
    title: 'Reviewer profile | Sayso',
    description: "View this reviewer's activity on Sayso, Cape Town's hyper-local reviews and discovery app.",
    url: `/reviewer/${id}`,
    noindex: true,
    nofollow: true,
    type: 'profile',
  });
}

export default async function ReviewerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getReviewerProfile(id);

  const schemas: object[] = [];

  if (profile) {
    const name = profile.display_name || profile.username || 'Reviewer';
    const reviewerUrl = `${SITE_URL}/reviewer/${id}`;

    schemas.push(
      generatePersonSchema({
        name,
        url: reviewerUrl,
        image: profile.avatar_url || undefined,
        description: profile.bio || undefined,
      }),
      generateBreadcrumbSchema([
        { name: 'Home', url: `${SITE_URL}/home` },
        { name: 'Leaderboard', url: `${SITE_URL}/leaderboard` },
        { name, url: reviewerUrl },
      ])
    );
  }

  return (
    <>
      {schemas.length > 0 && <SchemaMarkup schemas={schemas} />}
      {children}
    </>
  );
}
