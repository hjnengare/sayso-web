import { Metadata } from 'next';
import { PageMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = PageMetadata.terms();

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
