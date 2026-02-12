import type { Metadata } from 'next';
import EventsSpecialsPage from '../events-specials/page';
import { PageMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = PageMetadata.eventsSpecials();

export default function EventsPage() {
  return <EventsSpecialsPage />;
}
