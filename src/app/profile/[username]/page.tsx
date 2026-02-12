import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { notFound, redirect } from 'next/navigation';
import { generateSEOMetadata } from '../../lib/utils/seoMetadata';

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function getProfileByUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;

  const supabase = getSupabase();
  const { data } = await supabase
    .from('profiles')
    .select('user_id, username, display_name, avatar_url, reviews_count')
    .ilike('username', normalized)
    .maybeSingle();

  return data;
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    return generateSEOMetadata({
      title: `${username} profile | Sayso`,
      description: 'Public reviewer profile on Sayso.',
      url: `/profile/${username}`,
      noindex: true,
      nofollow: true,
      type: 'profile',
    });
  }

  const displayName = profile.display_name || profile.username || username;
  const reviewCount = profile.reviews_count || 0;

  return generateSEOMetadata({
    title: `${displayName}'s Cape Town reviews | Sayso`,
    description: `${displayName} has written ${reviewCount} review${reviewCount === 1 ? '' : 's'} on Sayso, Cape Town's hyper-local reviews and discovery app.`,
    image: profile.avatar_url || undefined,
    keywords: [displayName, 'cape town reviewer', 'sayso profile'],
    url: `/profile/${profile.username || username}`,
    type: 'profile',
  });
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile?.user_id) {
    notFound();
  }

  redirect(`/reviewer/${profile.user_id}`);
}
