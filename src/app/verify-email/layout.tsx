import type { Metadata } from 'next';
import { generateSEOMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Verify your email | Sayso',
  description: 'Verify your Sayso account email to continue using features securely.',
  url: '/verify-email',
  noindex: true,
  nofollow: true,
  type: 'website',
});

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
