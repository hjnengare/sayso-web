# Ticketmaster Events Cron Job Setup

This guide explains how the Ticketmaster events fetching system works in our codebase.

## Overview

The system consists of:
1. **Service Function** (`src/app/lib/services/ticketmasterService.ts`) - Handles API calls and database operations
2. **API Route** (`src/app/api/cron/fetch-events/route.ts`) - Endpoint that can be called by cron services
3. **Database Table** (`ticketmaster_events`) - Stores fetched events

## Architecture

```
Cron Service (Vercel/GitHub Actions/etc.)
    ↓
GET /api/cron/fetch-events
    ↓
TicketmasterService.fetchAndStoreEvents()
    ↓
Ticketmaster API → Database
```

## Setup

### 1. Environment Variables

Add to your `.env` file:

```env
TICKETMASTER_API_KEY=your_api_key_here
CRON_SECRET=your_secret_here  # Optional but recommended
```

### 2. Database Migration

Run the migration to create the `ticketmaster_events` table:

```bash
# If using Supabase CLI
supabase migration up

# Or run manually in Supabase SQL Editor
# File: supabase/migrations/20250106_create_ticketmaster_cron.sql
```

### 3. Cron Job Configuration

#### Option A: Vercel Cron (Recommended for Vercel deployments)

Already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-events",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

The cron job runs every 6 hours automatically.

#### Option B: GitHub Actions

Create `.github/workflows/fetch-ticketmaster-events.yml`:

```yaml
name: Fetch Ticketmaster Events

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Allow manual trigger

jobs:
  fetch-events:
    runs-on: ubuntu-latest
    steps:
      - name: Call API Endpoint
        run: |
          curl -X GET \
            "${{ secrets.APP_URL }}/api/cron/fetch-events?city=Cape Town&size=50" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add secrets to GitHub:
- `APP_URL`: Your application URL (e.g., `https://your-app.vercel.app`)
- `CRON_SECRET`: Your cron secret (same as in `.env`)

#### Option C: External Cron Service

Use any cron service (Cronitor, EasyCron, etc.) to call:

```
GET https://your-app.vercel.app/api/cron/fetch-events?city=Cape Town&size=50
Authorization: Bearer YOUR_CRON_SECRET
```

## API Endpoint

### GET /api/cron/fetch-events

Fetches events from Ticketmaster API and stores them in the database.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `keyword` | string | - | Search keyword (e.g., "Madonna") |
| `city` | string | "Cape Town" | Filter by city |
| `size` | number | 20 | Number of events per page |
| `page` | number | 0 | Page number (0-indexed) |

**Headers:**

```
Authorization: Bearer YOUR_CRON_SECRET  # Required if CRON_SECRET is set
```

**Response:**

```json
{
  "success": true,
  "message": "Successfully processed 20 events",
  "events_processed": 20,
  "events_stored": 20,
  "inserted": 15,
  "updated": 5,
  "page": {
    "number": 0,
    "size": 20,
    "totalElements": 100
  },
  "timestamp": "2025-01-06T12:00:00.000Z"
}
```

## Service Function

The `TicketmasterService` class provides these methods:

### `fetchEventsFromAPI(apiKey, options)`

Fetches events from Ticketmaster API without storing them.

```typescript
import { TicketmasterService } from '@/app/lib/services/ticketmasterService';

const events = await TicketmasterService.fetchEventsFromAPI(apiKey, {
  city: 'Cape Town',
  size: 50,
});
```

### `storeEventsInDatabase(supabase, events)`

Stores events in the database.

```typescript
import { TicketmasterService } from '@/app/lib/services/ticketmasterService';
import { getServerSupabase } from '@/app/lib/supabase/server';

const supabase = await getServerSupabase();
const result = await TicketmasterService.storeEventsInDatabase(supabase, events);
```

### `fetchAndStoreEvents(supabase, apiKey, options)`

Fetches events and stores them in one call (used by the API route).

```typescript
const result = await TicketmasterService.fetchAndStoreEvents(supabase, apiKey, {
  city: 'Cape Town',
  size: 50,
});
```

## Manual Testing

### Test the API Endpoint

```bash
# Without authentication (if CRON_SECRET is not set)
curl "http://localhost:3000/api/cron/fetch-events?city=Cape Town"

# With authentication
curl -X GET \
  "http://localhost:3000/api/cron/fetch-events?city=Cape Town&size=50" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Test the Service Function

```typescript
// In a Next.js API route or server component
import { TicketmasterService } from '@/app/lib/services/ticketmasterService';
import { getServerSupabase } from '@/app/lib/supabase/server';

const supabase = await getServerSupabase();
const apiKey = process.env.TICKETMASTER_API_KEY!;

const result = await TicketmasterService.fetchAndStoreEvents(supabase, apiKey, {
  city: 'Cape Town',
  size: 20,
});

console.log(result);
```

## Database Schema

The `ticketmaster_events` table structure:

```sql
CREATE TABLE ticketmaster_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticketmaster_id VARCHAR(255) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'event',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  location TEXT,
  city TEXT,
  country TEXT,
  venue_name TEXT,
  venue_address TEXT,
  image_url TEXT,
  url TEXT,
  price_range JSONB,
  classification TEXT,
  segment TEXT,
  genre TEXT,
  sub_genre TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_fetched_at TIMESTAMPTZ
);
```

## Querying Events

```sql
-- Get recent events
SELECT title, city, start_date, segment 
FROM ticketmaster_events 
ORDER BY last_fetched_at DESC 
LIMIT 10;

-- Count events by city
SELECT city, COUNT(*) 
FROM ticketmaster_events 
GROUP BY city;

-- Get upcoming events
SELECT title, start_date, venue_name, city
FROM ticketmaster_events
WHERE start_date > NOW()
ORDER BY start_date ASC
LIMIT 20;
```

## Monitoring

### Check Logs

- **Vercel**: Dashboard → Functions → `/api/cron/fetch-events` → Logs
- **Local**: Check terminal output when running `npm run dev`

### Monitor Database

```sql
-- Check last fetch time
SELECT MAX(last_fetched_at) as last_fetch 
FROM ticketmaster_events;

-- Count total events
SELECT COUNT(*) as total_events 
FROM ticketmaster_events;

-- Check events by date
SELECT 
  DATE(start_date) as event_date,
  COUNT(*) as event_count
FROM ticketmaster_events
WHERE start_date > NOW()
GROUP BY DATE(start_date)
ORDER BY event_date ASC;
```

## Troubleshooting

### API Key Not Found

- Verify `TICKETMASTER_API_KEY` is set in environment variables
- Check `.env` file (local) or Vercel environment variables (production)

### Database Errors

- Ensure migration is run: `supabase migration up`
- Check table exists: `SELECT * FROM ticketmaster_events LIMIT 1;`
- Verify RLS policies allow inserts

### Rate Limiting

Ticketmaster API limits:
- 5 requests/second
- 5000 requests/day

If you hit limits:
- Reduce `size` parameter
- Increase time between cron runs
- Use pagination to fetch in batches

### Cron Job Not Running

**Vercel:**
- Check `vercel.json` is committed
- Verify cron job appears in Vercel Dashboard → Settings → Cron Jobs
- Check function logs for errors

**GitHub Actions:**
- Verify workflow file is in `.github/workflows/`
- Check Actions tab for workflow runs
- Ensure secrets are set correctly

## Next Steps

- Add filtering for specific event types
- Create API endpoints to query stored events
- Set up notifications for new events
- Add pagination support for fetching multiple pages
