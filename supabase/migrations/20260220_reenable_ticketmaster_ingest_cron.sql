-- Re-enable Ticketmaster ingestion pg_cron job.
-- Runtime execution is controlled by ENABLE_TICKETMASTER_INGEST.
-- Set ENABLE_TICKETMASTER_INGEST=true in the Supabase Edge Function env.

DO $$
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE NOTICE 'pg_cron is not installed; Ticketmaster cron cannot be scheduled.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ticketmaster-ingest-6h') THEN
    PERFORM cron.unschedule('ticketmaster-ingest-6h');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fetch-ticketmaster-events-edge-function') THEN
    PERFORM cron.unschedule('fetch-ticketmaster-events-edge-function');
  END IF;

  PERFORM cron.schedule(
    'ticketmaster-ingest-6h',
    '0 */6 * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://rnlbbnluoxydtqviwtqj.supabase.co/functions/v1/fetch-ticketmaster-events',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubGJibmx1b3h5ZHRxdml3dHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMTc0NzEsImV4cCI6MjA3NTc5MzQ3MX0.dUafp8rCHRTxrksX-XlOCjaNkLHx0t4sr_eboL4OpG8'
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $cron$
  );

  RAISE NOTICE 'Scheduled job: ticketmaster-ingest-6h';
END
$$;
