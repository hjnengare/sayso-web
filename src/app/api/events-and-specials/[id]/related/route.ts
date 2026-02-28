import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { mapEventsAndSpecialsRowToEventCard } from '@/app/lib/events/mapEvent';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '4'), 8);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // First fetch the current event to get city/type
  const { data: current } = await supabase
    .from('events_and_specials')
    .select('id, location, type, start_date')
    .eq('id', params.id)
    .maybeSingle();

  if (!current) return NextResponse.json({ events: [] });

  // Parse city from "venue • city • country" location string
  let city: string | null = null;
  const locationStr: string = current.location ?? '';
  if (locationStr.includes(' \u2022 ')) {
    const parts = locationStr.split(' \u2022 ').map((s: string) => s.trim()).filter(Boolean);
    city = parts[1] ?? null;
  }

  if (!city) return NextResponse.json({ events: [] });

  const now = new Date().toISOString();

  // Find upcoming events in the same city, same type, excluding current
  const { data: rows } = await supabase
    .from('events_and_specials')
    .select('id, title, type, location, start_date, end_date, image, icon, price, rating, booking_url, description, availability_status')
    .neq('id', params.id)
    .eq('type', current.type)
    .ilike('location', `%${city}%`)
    .gte('start_date', now)
    .order('start_date', { ascending: true })
    .limit(limit);

  const events = (rows ?? []).map((row: any) =>
    mapEventsAndSpecialsRowToEventCard({
      ...row,
      business_id: null,
      end_date: row.end_date ?? null,
      description: row.description ?? null,
      icon: row.icon ?? null,
      image: row.image ?? null,
      price: row.price ?? null,
      rating: row.rating ?? null,
      availability_status: row.availability_status ?? null,
    })
  );

  return NextResponse.json({ events });
}
