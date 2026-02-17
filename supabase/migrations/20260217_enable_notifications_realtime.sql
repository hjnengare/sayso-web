-- ============================================
-- Enable Supabase Realtime for Multiple Tables
-- ============================================
-- This migration enables real-time updates for tables that need live subscriptions
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Enable REPLICA IDENTITY FULL for all tables that need realtime
-- This is REQUIRED for Supabase Realtime to work with UPDATE and DELETE events

ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE businesses REPLICA IDENTITY FULL;
ALTER TABLE business_stats REPLICA IDENTITY FULL;
ALTER TABLE reviews REPLICA IDENTITY FULL;

-- Step 2: Add tables to the realtime publication
-- This enables broadcasting of changes to subscribed clients

-- Drop and recreate supabase_realtime publication to ensure clean state
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- Add tables to publication
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE businesses;
ALTER PUBLICATION supabase_realtime ADD TABLE business_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;

-- Optional: Add other tables that might need realtime in the future
-- Uncomment these if you need realtime for these tables:
-- ALTER TABLE messages REPLICA IDENTITY FULL;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Verify configuration
COMMENT ON TABLE notifications IS 'User notifications - Realtime enabled for INSERT, UPDATE, DELETE events';
COMMENT ON TABLE businesses IS 'Business listings - Realtime enabled for INSERT events';
COMMENT ON TABLE business_stats IS 'Business statistics - Realtime enabled for INSERT, UPDATE events';
COMMENT ON TABLE reviews IS 'User reviews - Realtime enabled for INSERT events';

-- ============================================
-- Verification Queries (Run these separately to check)
-- ============================================

-- Check replica identity for all tables:
-- SELECT relname, 
--        CASE relreplident
--          WHEN 'd' THEN 'default'
--          WHEN 'n' THEN 'nothing'
--          WHEN 'f' THEN 'full'
--          WHEN 'i' THEN 'index'
--        END as replica_identity
-- FROM pg_class 
-- WHERE relname IN ('notifications', 'businesses', 'business_stats', 'reviews');
-- Expected: All should show 'full'

-- Check publication:
-- SELECT schemaname, tablename 
-- FROM pg_publication_tables 
-- WHERE pubname = 'supabase_realtime' 
-- ORDER BY tablename;
-- Expected: Should list all 4 tables

-- Check current realtime subscriptions (after app runs):
-- SELECT * FROM pg_stat_replication;

