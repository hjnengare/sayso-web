import { Metadata } from 'next';
import Link from 'next/link';
import { DEFAULT_SITE_DESCRIPTION, generateSEOMetadata, SITE_URL } from '../../lib/utils/seoMetadata';
import { getServerSupabase } from '../../lib/supabase/server';
import SchemaMarkup from '../../components/SEO/SchemaMarkup';
import { generateBreadcrumbSchema, generateEventSchema } from '../../lib/utils/schemaMarkup';

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function getEventData(id: string) {
  const supabase = await getServerSupabase();

  const tryByTicketmasterId = async () =>
    supabase
      .from('ticketmaster_events')
      .select('id, title, description, image_url, image, location, start_date')
      .eq('ticketmaster_id', id)
      .single();

  const tryByUuidId = async () =>
    supabase
      .from('ticketmaster_events')
      .select('id, title, description, image_url, image, location, start_date')
      .eq('id', id)
      .single();

  const tryBusinessEventByUuidId = async () =>
    supabase
      .from('events_and_specials')
      .select('id, title, description, image, location, starts_at')
      .eq('id', id)
      .eq('type', 'event')
      .single();

  let event: any = null;
  let error: any = null;

  ({ data: event, error } = await tryByTicketmasterId());
  const notFound = error?.code === 'PGRST116';
  if (notFound && UUID_RE.test(id)) {
    ({ data: event, error } = await tryByUuidId());
  }
  if ((error?.code === 'PGRST116' || !event) && UUID_RE.test(id)) {
    ({ data: event, error } = await tryBusinessEventByUuidId());
  }

  if (!event || error) return null;
  return event;
}

/**
 * Generate dynamic metadata for event pages
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventData(id);

  if (!event) {
    return generateSEOMetadata({
      title: 'Event details | Sayso',
      description: DEFAULT_SITE_DESCRIPTION,
      url: `/event/${id}`,
      noindex: true,
      nofollow: true,
    });
  }

  return generateSEOMetadata({
    title: `${event.title} in Cape Town | Sayso`,
    description: event.description || `Discover ${event.title} on Sayso, Cape Town's hyper-local reviews and discovery app.`,
    keywords: [event.title, 'cape town events', 'sayso events'],
    image: event.image_url || event.image,
    url: `/event/${id}`,
    type: 'article',
  });
}

export default async function EventLayout({
  children,
  params,
}: EventLayoutProps) {
  const { id } = await params;
  const event = await getEventData(id);

  let schemas: object[] = [];
  let relatedLinks: Array<{ href: string; label: string }> = [];

  if (event) {
    const eventUrl = `${SITE_URL}/event/${id}`;
    const location = event.location || '';
    const citySlug = location ? toSlug(String(location).split(',')[0]) : '';
    const startDate = event.start_date || event.starts_at || undefined;

    const eventSchema = generateEventSchema({
      name: event.title,
      description: event.description || undefined,
      image: event.image_url || event.image || undefined,
      url: eventUrl,
      location: location || undefined,
      startDate: startDate || undefined,
    });

    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: 'Home', url: `${SITE_URL}/home` },
      { name: 'Events', url: `${SITE_URL}/events` },
      { name: event.title, url: eventUrl },
    ]);

    schemas = [eventSchema, breadcrumbSchema];
    relatedLinks = [
      { href: '/events', label: 'More events and specials' },
      ...(citySlug ? [{ href: `/${citySlug}`, label: `More events in ${location}` }] : []),
    ];
  }

  return (
    <>
      {schemas.length > 0 && <SchemaMarkup schemas={schemas} />}
      {relatedLinks.length > 0 && (
        <nav aria-label="Related links" className="sr-only">
          <ul>
            {relatedLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {children}
    </>
  );
}
