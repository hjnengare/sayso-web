-- ============================================
-- Check if events were fetched successfully
-- ============================================

-- 1. Count total events in database
SELECT COUNT(*) as total_events FROM ticketmaster_events;

-- 2. View recent events (last 10)
SELECT 
  id,
  title,
  city,
  start_date,
  segment,
  genre,
  created_at
FROM ticketmaster_events 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check events by city
SELECT 
  city,
  COUNT(*) as event_count
FROM ticketmaster_events
GROUP BY city
ORDER BY event_count DESC;

-- 4. Check events by segment (to see what types we're getting)
SELECT 
  segment,
  COUNT(*) as event_count
FROM ticketmaster_events
WHERE segment IS NOT NULL
GROUP BY segment
ORDER BY event_count DESC;

-- 5. Check if any events pass the dopamine filter
-- (Music, Arts, or have dopamine keywords)
SELECT 
  COUNT(*) as dopamine_events
FROM ticketmaster_events
WHERE 
  segment ILIKE '%music%' 
  OR segment ILIKE '%arts%'
  OR title ILIKE '%festival%'
  OR title ILIKE '%concert%'
  OR title ILIKE '%dj%'
  OR title ILIKE '%comedy%'
  OR title ILIKE '%party%';

-- 6. View sample dopamine events
SELECT 
  title,
  city,
  segment,
  genre,
  start_date
FROM ticketmaster_events
WHERE 
  segment ILIKE '%music%' 
  OR segment ILIKE '%arts%'
  OR title ILIKE '%festival%'
  OR title ILIKE '%concert%'
  OR title ILIKE '%dj%'
  OR title ILIKE '%comedy%'
  OR title ILIKE '%party%'
ORDER BY start_date ASC
LIMIT 20;

