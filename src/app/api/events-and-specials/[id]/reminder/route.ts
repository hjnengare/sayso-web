import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

type RemindBefore = '1_day' | '2_hours';

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

function computeRemindAt(eventStartISO: string, remindBefore: RemindBefore): Date {
  const start = new Date(eventStartISO);
  if (remindBefore === '1_day') {
    return new Date(start.getTime() - 24 * 3_600_000);
  }
  return new Date(start.getTime() - 2 * 3_600_000);
}

// GET /api/events-and-specials/[id]/reminder
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await makeClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ reminders: [] });

  const { data } = await supabase
    .from('event_reminders')
    .select('remind_before, remind_at')
    .eq('event_id', params.id)
    .eq('user_id', user.id)
    .eq('sent', false);

  return NextResponse.json({ reminders: data ?? [] });
}

// POST /api/events-and-specials/[id]/reminder
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await makeClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const remindBefore: RemindBefore = body.remind_before;
  const eventTitle: string = body.event_title ?? 'Event';
  const eventStartISO: string = body.event_start_iso;

  if (!remindBefore || !['1_day', '2_hours'].includes(remindBefore)) {
    return NextResponse.json({ error: 'Invalid remind_before' }, { status: 400 });
  }
  if (!eventStartISO || isNaN(new Date(eventStartISO).getTime())) {
    return NextResponse.json({ error: 'Invalid event_start_iso' }, { status: 400 });
  }

  const remindAt = computeRemindAt(eventStartISO, remindBefore);

  // Don't create if remind_at is already in the past
  if (remindAt <= new Date()) {
    return NextResponse.json({ error: 'Reminder time has already passed' }, { status: 400 });
  }

  const { error } = await supabase.from('event_reminders').upsert(
    {
      user_id: user.id,
      event_id: params.id,
      event_title: eventTitle,
      event_start_iso: eventStartISO,
      remind_before: remindBefore,
      remind_at: remindAt.toISOString(),
      sent: false,
    },
    { onConflict: 'user_id,event_id,remind_before' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, remind_at: remindAt.toISOString() });
}

// DELETE /api/events-and-specials/[id]/reminder?remind_before=1_day
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await makeClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const remindBefore = req.nextUrl.searchParams.get('remind_before');
  if (!remindBefore) {
    return NextResponse.json({ error: 'remind_before required' }, { status: 400 });
  }

  await supabase
    .from('event_reminders')
    .delete()
    .eq('event_id', params.id)
    .eq('user_id', user.id)
    .eq('remind_before', remindBefore);

  return NextResponse.json({ ok: true });
}
