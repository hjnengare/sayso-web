import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createNotification } from '@/app/lib/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date().toISOString();

  const { data: due, error } = await supabase
    .from('event_reminders')
    .select('id, user_id, event_id, event_title, remind_before')
    .lte('remind_at', now)
    .eq('sent', false)
    .limit(100);

  if (error) {
    console.error('[send-event-reminders] fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!due?.length) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  const sentIds: string[] = [];

  for (const reminder of due) {
    const label = reminder.remind_before === '1_day' ? 'tomorrow' : 'in 2 hours';
    const eventPath = `/event/${reminder.event_id}`;

    await createNotification({
      userId: reminder.user_id,
      type: 'event_reminder',
      title: 'Event Reminder',
      message: `"${reminder.event_title}" starts ${label}. Don't miss it!`,
      entityId: reminder.event_id,
      link: eventPath,
    });

    sentIds.push(reminder.id);
    sent++;
  }

  if (sentIds.length) {
    await supabase
      .from('event_reminders')
      .update({ sent: true })
      .in('id', sentIds);
  }

  return NextResponse.json({ sent });
}
