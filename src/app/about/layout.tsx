import { Metadata } from 'next';
import { PageMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = PageMetadata.about();

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
