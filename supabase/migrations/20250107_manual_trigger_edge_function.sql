-- ============================================
-- Manual Trigger: Fetch Ticketmaster Events
-- ============================================
-- Run this SQL to manually trigger the Edge Function
-- Useful for testing or first-time population
-- ============================================

-- Manually trigger the Edge Function via HTTP POST
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

-- Check the result (the request_id can be used to check status)
-- SELECT * FROM net.http_request_queue WHERE id = <request_id>;

