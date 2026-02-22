import { Metadata } from 'next';
import { ReactNode } from 'react';
import { PageMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = PageMetadata.notifications();

export default function NotificationsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
