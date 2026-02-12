import type { Metadata } from 'next';
import HomePage from '../home/page';
import { generateSEOMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Search Cape Town businesses and reviews | Sayso',
  description:
    'Search Sayso to discover Cape Town restaurants, salons, gyms, events, and more with trusted hyper-local community ratings.',
  keywords: ['search cape town businesses', 'cape town business reviews', 'sayso reviews'],
  url: '/search',
  type: 'website',
});

export default function SearchPage() {
  return <HomePage />;
}
