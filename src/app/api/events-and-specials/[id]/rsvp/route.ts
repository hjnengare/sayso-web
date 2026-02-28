import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function makeClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
}

async function getRsvpCount(supabase: any, eventId: string): Promise<number> {
  const { count } = await supabase
    .from('event_rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);
  return count ?? 0;
}

// GET /api/events-and-specials/[id]/rsvp
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await makeClient();
  const { data: { user } } = await supabase.auth.getUser();
  const eventId = params.id;

  const count = await getRsvpCount(supabase, eventId);

  let userRsvpd = false;
  if (user) {
    const { data } = await supabase
      .from('event_rsvps')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();
    userRsvpd = !!data;
  }

  return NextResponse.json({ count, userRsvpd });
}

// POST /api/events-and-specials/[id]/rsvp — toggle
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await makeClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const eventId = params.id;

  // Check if already RSVP'd
  const { data: existing } = await supabase
    .from('event_rsvps')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);
  } else {
    await supabase
      .from('event_rsvps')
      .insert({ event_id: eventId, user_id: user.id });
  }

  const count = await getRsvpCount(supabase, eventId);
  return NextResponse.json({ count, isGoing: !existing });
}
