import type { Metadata } from 'next';
import { generateSEOMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Reset password | Sayso',
  description: 'Set a new password for your Sayso account.',
  url: '/reset-password',
  noindex: true,
  nofollow: true,
  type: 'website',
});

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
