-- ============================================
-- Supabase pg_cron Job for Ticketmaster Edge Function
-- ============================================
-- This migration sets up a cron job to automatically call
-- the Supabase Edge Function every 6 hours
-- ============================================

-- Enable pg_cron extension (if not already enabled)
-- Note: This requires superuser privileges and may need to be done via Supabase Dashboard
-- Go to Database > Extensions and enable "pg_cron"
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
-- This is required to make HTTP calls from within the database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- IMPORTANT: Replace these values with your actual project details
-- ============================================
-- 1. Replace 'YOUR_PROJECT_REF' with your Supabase project reference
--    (found in your project URL: https://YOUR_PROJECT_REF.supabase.co)
-- 2. Replace 'YOUR_ANON_KEY' with your Supabase anon key
--    (found in Settings > API > anon/public key)
-- ============================================

-- Function to get Supabase project URL and anon key
-- Tries multiple sources: app_config table, database settings, or hardcoded values
CREATE OR REPLACE FUNCTION get_supabase_edge_function_url()
RETURNS TEXT AS $$
DECLARE
  v_url TEXT;
BEGIN
  -- Option 1: Get from app_config table (if it exists)
  BEGIN
    SELECT value INTO v_url
    FROM app_config 
    WHERE key = 'SUPABASE_EDGE_FUNCTION_URL'
    LIMIT 1;
    
    IF v_url IS NOT NULL AND v_url != '' THEN
      RETURN v_url;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, continue to next option
      NULL;
  END;
  
  -- Option 2: Fallback to database setting
  BEGIN
    v_url := current_setting('app.supabase_edge_function_url', true);
    IF v_url IS NOT NULL AND v_url != '' THEN
      RETURN v_url;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;
  
  -- Option 3: Default (hardcoded for this project)
  RETURN 'https://rnlbbnluoxydtqviwtqj.supabase.co/functions/v1/fetch-ticketmaster-events';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_supabase_anon_key()
RETURNS TEXT AS $$
DECLARE
  v_key TEXT;
BEGIN
  -- Option 1: Get from app_config table (if it exists)
  BEGIN
    SELECT value INTO v_key
    FROM app_config 
    WHERE key = 'SUPABASE_ANON_KEY'
    LIMIT 1;
    
    IF v_key IS NOT NULL AND v_key != '' THEN
      RETURN v_key;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, continue to next option
      NULL;
  END;
  
  -- Option 2: Fallback to database setting
  BEGIN
    v_key := current_setting('app.supabase_anon_key', true);
    IF v_key IS NOT NULL AND v_key != '' THEN
      RETURN v_key;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;
  
  -- Option 3: Default (hardcoded for this project)
  RETURN 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubGJibmx1b3h5ZHRxdml3dHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMTc0NzEsImV4cCI6MjA3NTc5MzQ3MX0.dUafp8rCHRTxrksX-XlOCjaNkLHx0t4sr_eboL4OpG8';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- CRON JOB: Call Edge Function every 6 hours
-- ============================================
-- This cron job calls your Supabase Edge Function via HTTP POST
-- Schedule: '0 */6 * * *' = every 6 hours at minute 0

-- First, unschedule any existing job with the same name
SELECT cron.unschedule('fetch-ticketmaster-events-edge-function')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'fetch-ticketmaster-events-edge-function'
);

-- Schedule the cron job
-- Note: Cron schedule format is 'minute hour day month weekday'
-- '0 */6 * * *' means every 6 hours at minute 0
SELECT cron.schedule(
  'fetch-ticketmaster-events-edge-function',
  $$0 */6 * * *$$,
  $$
  SELECT net.http_post(
    url := get_supabase_edge_function_url(),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_supabase_anon_key()
    ),
    body := jsonb_build_object(
      'city', 'Cape Town',
      'size', 50
    )
  ) AS request_id;
  $$
);

-- ============================================
-- ALTERNATIVE: Direct URL (simpler, but less flexible)
-- ============================================
-- If you prefer to hardcode the URL, uncomment and modify this:
/*
SELECT cron.unschedule('fetch-ticketmaster-events-edge-function')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'fetch-ticketmaster-events-edge-function'
);

SELECT cron.schedule(
  'fetch-ticketmaster-events-edge-function',
  '0 */6 * * *'::text,
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-ticketmaster-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY_HERE'
    ),
    body := jsonb_build_object(
      'city', 'Cape Town',
      'size', 50
    )
  ) AS request_id;
  $$
);
*/

-- ============================================
-- SETUP INSTRUCTIONS
-- ============================================
-- 1. Enable extensions in Supabase Dashboard:
--    Database > Extensions > Enable "pg_cron" and "pg_net"
--
-- 2. Set your Supabase project details (choose ONE method):
--
--    METHOD A: Edit the functions above (simplest)
--    Replace 'YOUR_PROJECT_REF' and 'YOUR_ANON_KEY_HERE' in the functions
--    with your actual values, then run this migration.
--
--    METHOD B: Use app_config table (if migration 20250106_create_app_config_table.sql was run):
--      INSERT INTO app_config (key, value) VALUES 
--        ('SUPABASE_EDGE_FUNCTION_URL', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-ticketmaster-events'),
--        ('SUPABASE_ANON_KEY', 'your_anon_key_here')
--      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
--    METHOD C: Use database settings (requires superuser):
--      ALTER DATABASE postgres SET app.supabase_edge_function_url = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-ticketmaster-events';
--      ALTER DATABASE postgres SET app.supabase_anon_key = 'your_anon_key_here';
--
-- 3. Get your values from Supabase Dashboard:
--    - Project URL: Settings > API > Project URL (e.g., https://abc123.supabase.co)
--    - Anon Key: Settings > API > anon/public key
--
-- 4. The cron job will automatically start running
--
-- 5. Monitor execution:
--    SELECT * FROM cron.job_run_details 
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'fetch-ticketmaster-events-edge-function')
--    ORDER BY start_time DESC LIMIT 10;

-- ============================================
-- VIEW AND MANAGE CRON JOBS
-- ============================================
-- View all cron jobs:
-- SELECT * FROM cron.job;
--
-- View execution history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- Unschedule the job:
-- SELECT cron.unschedule('fetch-ticketmaster-events-edge-function');
--
-- Reschedule to run every 4 hours:
-- SELECT cron.unschedule('fetch-ticketmaster-events-edge-function');
-- SELECT cron.schedule('fetch-ticketmaster-events-edge-function', '0 */4 * * *', $$SELECT net.http_post(...)$$);

COMMENT ON FUNCTION get_supabase_edge_function_url() IS 'Returns the Supabase Edge Function URL for Ticketmaster events';
COMMENT ON FUNCTION get_supabase_anon_key() IS 'Returns the Supabase anon key for authenticating Edge Function requests';

