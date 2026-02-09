-- ============================================
-- Update Ticketmaster cron to v2 edge function
-- ============================================
-- The new edge function handles multi-city, pagination, consolidation,
-- and cleanup internally. No body params needed — cities come from
-- the CITIES env var (default: Cape Town,Johannesburg,Durban).
--
-- Prerequisites:
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- Edge function env vars required:
--   TICKETMASTER_API_KEY, SYSTEM_USER_ID, SYSTEM_BUSINESS_ID
--   CITIES (optional, defaults to Cape Town,Johannesburg,Durban)
-- ============================================

-- Remove old single-city cron job
SELECT cron.unschedule('fetch-ticketmaster-events-edge-function')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'fetch-ticketmaster-events-edge-function'
);

-- Schedule v2: every 6 hours, no body params (function reads env internally)
SELECT cron.schedule(
  'ticketmaster-ingest-6h',
  $$0 */6 * * *$$,
  $$
  SELECT net.http_post(
    url    := 'https://rnlbbnluoxydtqviwtqj.supabase.co/functions/v1/fetch-ticketmaster-events',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubGJibmx1b3h5ZHRxdml3dHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMTc0NzEsImV4cCI6MjA3NTc5MzQ3MX0.dUafp8rCHRTxrksX-XlOCjaNkLHx0t4sr_eboL4OpG8'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
