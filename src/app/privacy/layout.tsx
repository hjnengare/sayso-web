import { Metadata } from 'next';
import { PageMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = PageMetadata.privacy();

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
