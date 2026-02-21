# Realtime Configuration Guide

This document outlines the steps to configure Supabase Realtime for instant UI updates across reviews, likes, and badges.

## 1. Enable Realtime Replication on Tables

Navigate to **Supabase Dashboard > Database > Replication** and enable Realtime for the following tables:

### Tables to Enable:
- `reviews`
- `review_helpful_votes`
- `user_badges`
- `business_stats`

Or execute this SQL in the SQL Editor:

```sql
-- Enable Realtime for reviews table
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;

-- Enable Realtime for helpful votes
ALTER PUBLICATION supabase_realtime ADD TABLE review_helpful_votes;

-- Enable Realtime for user badges
ALTER PUBLICATION supabase_realtime ADD TABLE user_badges;

-- Enable Realtime for business stats
ALTER PUBLICATION supabase_realtime ADD TABLE business_stats;
```

## 2. Configure Column-Level Replication

To minimize bandwidth and exclude sensitive data, configure which columns are replicated:

```sql
-- Reviews: Only replicate UI-necessary columns
-- (Exclude sensitive fields like IPs, anonymous IDs, etc.)
-- Note: Supabase replicates all columns by default. For column-level control,
-- use Postgres replication identity and security policies.

-- Ensure reviews table has RLS enabled
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Ensure helpful_votes table has RLS enabled
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- Ensure user_badges table has RLS enabled  
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Ensure business_stats table has RLS enabled
ALTER TABLE business_stats ENABLE ROW LEVEL SECURITY;
```

## 3. RLS Policies for Realtime

Ensure Row Level Security policies allow realtime replication for authenticated users:

```sql
-- Reviews: Allow select for all authenticated users
CREATE POLICY "Reviews readable by authenticated users" 
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

-- Review helpful votes: Allow select for authenticated users
CREATE POLICY "Helpful votes readable by authenticated users"
  ON review_helpful_votes FOR SELECT
  TO authenticated
  USING (true);

-- User badges: Allow users to see their own badges
CREATE POLICY "User badges readable by owner"
  ON user_badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Business stats: Allow select for all authenticated users
CREATE POLICY "Business stats readable by authenticated users"
  ON business_stats FOR SELECT
  TO authenticated
  USING (true);
```

## 4. Verify Realtime Configuration

### Test Realtime Connection

Run this in your browser console (with your app running):

```javascript
import { getBrowserSupabase } from '@/app/lib/supabase/client';

const supabase = getBrowserSupabase();

// Test reviews subscription
const channel = supabase
  .channel('test-reviews')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'reviews'
  }, (payload) => {
    console.log('Review change detected:', payload);
  })
  .subscribe((status) => {
    console.log('Subscription status:', status);
  });
```

### Expected Console Output:
```
Subscription status: SUBSCRIBED
```

When a review is created/updated/deleted, you should see:
```
Review change detected: { eventType: 'INSERT', new: {...}, old: null }
```

## 5. Security Checklist

- [ ] RLS enabled on all Realtime tables
- [ ] RLS policies restrict access appropriately
- [ ] Sensitive columns (IPs, tokens, etc.) never replicated to client
- [ ] Rate limiting configured for writes
- [ ] Realtime only enabled for authenticated users (where applicable)

## 6. Monitoring & Performance

### Check Active Realtime Connections

```sql
SELECT 
  application_name,
  state,
  COUNT(*) as connection_count
FROM pg_stat_activity
WHERE application_name LIKE '%realtime%'
GROUP BY application_name, state;
```

### Monitor Replication Lag

```sql
SELECT 
  slot_name,
  active,
  restart_lsn,
  confirmed_flush_lsn,
  pg_current_wal_lsn() - confirmed_flush_lsn AS replication_lag
FROM pg_replication_slots
WHERE slot_name = 'supabase_realtime_replication_slot';
```

## 7. Troubleshooting

### Realtime Not Working

1. **Check RLS Policies**: Ensure authenticated users can SELECT from the table
2. **Verify Replication**: Confirm table is added to supabase_realtime publication
3. **Check Browser Console**: Look for WebSocket connection errors
4. **Test with curl**: Verify API endpoint responds correctly

### High Latency

1. **Reduce Payload Size**: Ensure only necessary columns are replicated
2. **Debounce High-Frequency Updates**: Use debouncing for helpful votes
3. **Batch Operations**: Group related updates where possible

### Connection Drops

1. **Implement Reconnection Logic**: Already handled in `useRealtime` hooks
2. **Check Network Stability**: Verify no proxy/firewall issues
3. **Monitor Connection Count**: Ensure not hitting connection limits

## 8. Production Optimization

### Recommended Settings

```sql
-- Increase max replication slots if needed
ALTER SYSTEM SET max_replication_slots = 20;

-- Adjust wal_sender_timeout for slower clients
ALTER SYSTEM SET wal_sender_timeout = '60s';

-- Reload configuration
SELECT pg_reload_conf();
```

### Rate Limiting

Configure rate limiting in Supabase Dashboard > Settings > API:
- Limit realtime connections per IP: 10
- Limit subscriptions per connection: 100

## 9. Testing Checklist

After configuration, test these scenarios:

- [ ] New review appears instantly on business page
- [ ] Helpful count updates in real-time when voted
- [ ] Badge notification shows when badge awarded
- [ ] Live indicator displays when connected
- [ ] Reconnects after temporary network loss
- [ ] Works across multiple browser tabs
- [ ] No layout shift or hydration errors
- [ ] Performance remains consistent with 100+ reviews

## 10. Rollback Plan

If issues arise, disable Realtime cleanly:

```sql
-- Remove tables from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE reviews;
ALTER PUBLICATION supabase_realtime DROP TABLE review_helpful_votes;
ALTER PUBLICATION supabase_realtime DROP TABLE user_badges;
ALTER PUBLICATION supabase_realtime DROP TABLE business_stats;
```

App will fall back to traditional polling/refetch mechanisms automatically.
