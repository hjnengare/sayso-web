-- =============================================================================
-- Event Smart Features Migration
-- Adds: availability_status, event_rsvps, event_reminders, extended notif type
-- =============================================================================

-- 1. Availability status on events_and_specials
ALTER TABLE events_and_specials
  ADD COLUMN IF NOT EXISTS availability_status text
  CHECK (availability_status IN ('sold_out', 'limited'));

-- 2. Extend notifications CHECK constraint to include 'event_reminder'
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'review', 'business', 'user', 'highlyRated', 'message',
      'otp_sent', 'otp_verified', 'claim_status_changed',
      'docs_requested', 'docs_received', 'gamification',
      'badge_earned', 'review_helpful', 'business_approved',
      'claim_approved', 'comment_reply', 'photo_approved',
      'milestone_achievement', 'event_reminder'
    )
  );

-- 3. event_rsvps (authenticated users only; guests tracked client-side)
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);
CREATE INDEX IF NOT EXISTS event_rsvps_event_id_idx ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS event_rsvps_user_id_idx ON event_rsvps(user_id);
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own RSVPs"
  ON event_rsvps FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public RSVP counts"
  ON event_rsvps FOR SELECT USING (true);

-- 4. event_reminders
CREATE TABLE IF NOT EXISTS event_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  event_title text NOT NULL,
  event_start_iso timestamptz NOT NULL,
  remind_before text NOT NULL DEFAULT '1_day'
    CHECK (remind_before IN ('1_day', '2_hours')),
  remind_at timestamptz NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id, remind_before)
);
CREATE INDEX IF NOT EXISTS event_reminders_due_idx
  ON event_reminders(remind_at) WHERE NOT sent;
CREATE INDEX IF NOT EXISTS event_reminders_user_id_idx ON event_reminders(user_id);
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reminders"
  ON event_reminders FOR ALL USING (auth.uid() = user_id);
