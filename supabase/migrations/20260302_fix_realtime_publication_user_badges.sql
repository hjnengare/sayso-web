-- ============================================
-- Fix Realtime publication coverage for badge popups
-- ============================================
-- Regression source:
-- 20260217_enable_notifications_realtime.sql recreated supabase_realtime
-- but omitted public.user_badges, which powers the realtime badge popup.
--
-- This migration safely re-adds missing tables to supabase_realtime.

-- Ensure replica identity supports richer realtime payloads.
ALTER TABLE public.user_badges REPLICA IDENTITY FULL;
ALTER TABLE public.review_helpful_votes REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- Ensure the publication exists (defensive for non-standard environments)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- Badge popup stream (RealtimeContext/useRealtimeBadges)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_badges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;
  END IF;

  -- Helpful vote realtime stream (useRealtimeHelpfulVotes)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'review_helpful_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.review_helpful_votes;
  END IF;
END
$$;

COMMENT ON TABLE public.user_badges IS
  'User badge awards - Realtime enabled for badge-earned popup notifications';

COMMENT ON TABLE public.review_helpful_votes IS
  'Review helpful votes - Realtime enabled for live helpful count updates';
