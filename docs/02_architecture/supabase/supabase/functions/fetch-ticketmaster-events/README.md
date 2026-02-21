# Fetch Ticketmaster Events - Supabase Edge Function

This Edge Function fetches events from the Ticketmaster API and stores them in the `ticketmaster_events` table.

## Setup

### 1. Set Environment Secrets

In Supabase Dashboard, go to **Edge Functions > Secrets** and set:

- `TICKETMASTER_API_KEY` - Your Ticketmaster API key
- `SUPABASE_URL` - Your Supabase project URL (usually auto-configured)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (usually auto-configured)

Or via CLI:
```bash
supabase secrets set TICKETMASTER_API_KEY=your_api_key_here
```

### 2. Deploy the Function

```bash
supabase functions deploy fetch-ticketmaster-events
```

### 3. Schedule the Function

#### Option A: Using Supabase Dashboard
1. Go to **Database > Cron Jobs** (if available)
2. Or use **Database > Extensions > pg_cron** to schedule HTTP requests

#### Option B: Using External Cron Service
Use a service like [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com) to call:

```
POST https://YOUR_PROJECT.supabase.co/functions/v1/fetch-ticketmaster-events
Headers:
  Authorization: Bearer YOUR_ANON_KEY
Body (optional):
  {
    "city": "Cape Town",
    "size": 50
  }
```

#### Option C: Using pg_cron (if enabled)
```sql
-- Schedule to run every 6 hours
SELECT cron.schedule(
  'fetch-ticketmaster-events',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/fetch-ticketmaster-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body := jsonb_build_object(
      'city', 'Cape Town',
      'size', 50
    )
  ) AS request_id;
  $$
);
```

## Usage

### Manual Invocation

```bash
# Via Supabase CLI
supabase functions invoke fetch-ticketmaster-events

# Via HTTP
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/fetch-ticketmaster-events' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"city": "Cape Town", "size": 50}'
```

### Query Parameters

- `city` (optional): City to fetch events for (default: "Cape Town")
- `size` (optional): Number of events per page (default: 50)
- `page` (optional): Page number (default: 0)
- `keyword` (optional): Search keyword

## Response

```json
{
  "success": true,
  "message": "Successfully processed 50 events",
  "events_processed": 50,
  "events_stored": 50,
  "inserted": 30,
  "updated": 20,
  "page": {
    "number": 0,
    "size": 50,
    "totalElements": 150
  },
  "timestamp": "2025-01-07T12:00:00.000Z"
}
```

## Notes

- Events are upserted based on `ticketmaster_id` (updates existing, inserts new)
- The function handles errors gracefully and continues processing
- Make sure the `ticketmaster_events` table exists (see migration: `20250106_create_ticketmaster_cron.sql`)

