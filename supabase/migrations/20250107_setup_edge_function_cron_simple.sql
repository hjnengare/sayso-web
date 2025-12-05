-- ============================================
-- Simple Cron Job Setup - Single SQL Statement
-- ============================================
-- Enable extensions first (if not already enabled):
-- Database > Extensions > Enable "pg_cron" and "pg_net"
-- ============================================

-- Unschedule existing job if it exists
SELECT cron.unschedule('fetch-ticketmaster-events-edge-function')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'fetch-ticketmaster-events-edge-function'
);

-- Schedule cron job to run every 6 hours
SELECT cron.schedule(
  'fetch-ticketmaster-events-edge-function',
  $$0 */6 * * *$$,
  $$
  SELECT net.http_post(
    url := 'https://rnlbbnluoxydtqviwtqj.supabase.co/functions/v1/fetch-ticketmaster-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubGJibmx1b3h5ZHRxdml3dHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMTc0NzEsImV4cCI6MjA3NTc5MzQ3MX0.dUafp8rCHRTxrksX-XlOCjaNkLHx0t4sr_eboL4OpG8'
    ),
    body := jsonb_build_object(
      'city', 'Cape Town',
      'size', 50
    )
  ) AS request_id;
  $$
);

