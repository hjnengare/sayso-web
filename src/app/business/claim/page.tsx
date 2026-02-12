import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { generateSEOMetadata } from '../../lib/utils/seoMetadata';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Claim your business | Sayso',
  description: 'Start or continue your Sayso business claim.',
  url: '/business/claim',
  noindex: true,
  nofollow: true,
  type: 'website',
});

export default function BusinessClaimAliasPage() {
  redirect('/claim-business');
}
