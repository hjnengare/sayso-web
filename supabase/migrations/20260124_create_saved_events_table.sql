-- Migration: Create saved_events table for user event favorites
CREATE TABLE IF NOT EXISTS saved_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, event_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_events_user_id ON saved_events(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_event_id ON saved_events(event_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_user_created ON saved_events(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own saved events
CREATE POLICY "Users can view their own saved events"
  ON saved_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved events"
  ON saved_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved events"
  ON saved_events FOR DELETE
  USING (auth.uid() = user_id);
