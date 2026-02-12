import type { Metadata } from 'next';
import { generateSEOMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Forgot password | Sayso',
  description: 'Request a password reset link for your Sayso account.',
  url: '/forgot-password',
  noindex: true,
  nofollow: true,
  type: 'website',
});

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
