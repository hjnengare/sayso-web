import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { generateSEOMetadata } from '../../lib/utils/seoMetadata';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = getSupabase();

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url, reviews_count')
      .eq('user_id', id)
      .single();

    if (profile) {
      const name = profile.display_name || profile.username || 'Reviewer';
      const reviewCount = profile.reviews_count || 0;
      const canonicalPath = profile.username ? `/profile/${profile.username}` : `/reviewer/${id}`;

      return generateSEOMetadata({
        title: `${name}'s Cape Town reviews | Sayso`,
        description: `${name} has written ${reviewCount} review${reviewCount !== 1 ? 's' : ''} on Sayso, Cape Town's hyper-local reviews and discovery app.`,
        keywords: [name, 'reviewer profile', 'cape town reviews', 'sayso community'],
        image: profile.avatar_url || undefined,
        url: canonicalPath,
        type: 'profile',
      });
    }
  } catch (error) {
    console.error('[Reviewer Metadata] Error fetching reviewer:', error);
  }

  return generateSEOMetadata({
    title: 'Reviewer profile | Sayso',
    description: 'View this reviewer\'s activity on Sayso, Cape Town\'s hyper-local reviews and discovery app.',
    url: `/reviewer/${id}`,
    noindex: true,
    nofollow: true,
    type: 'profile',
  });
}

export default function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
