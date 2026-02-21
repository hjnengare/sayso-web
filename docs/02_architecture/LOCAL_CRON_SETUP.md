# Running the Cron Job Locally

This guide explains how to manually trigger the Ticketmaster events fetch cron job in your local development environment.

## Prerequisites

1. **Next.js dev server running**: Make sure your development server is running
   ```bash
   npm run dev
   ```

2. **Environment variables set**: Ensure your `.env.local` or `.env` file has:
   ```env
   TICKETMASTER_API_KEY=your_api_key_here
   CRON_SECRET=your_secret_here  # Optional but recommended
   ```

3. **Supabase configured**: Your Supabase connection should be properly configured

## Method 1: Using the NPM Script (Recommended)

The easiest way to run the cron job locally:

```bash
# Basic usage (defaults to Cape Town, 20 events)
npm run fetch-events

# With custom city and size
npm run fetch-events -- --city "Cape Town" --size 50

# With keyword search
npm run fetch-events -- --keyword "music" --city "Cape Town"

# See all options
npm run fetch-events -- --help
```

## Method 2: Using the Script Directly

You can also run the script directly with Node.js:

```bash
# Basic usage
node scripts/fetch-events.js

# With options
node scripts/fetch-events.js --city "Cape Town" --size 50 --keyword "music"
```

## Method 3: Using cURL

You can manually call the API endpoint using cURL:

```bash
# Without authentication (if CRON_SECRET is not set)
curl "http://localhost:3000/api/cron/fetch-events?city=Cape Town&size=20"

# With authentication (if CRON_SECRET is set)
curl -X GET \
  "http://localhost:3000/api/cron/fetch-events?city=Cape Town&size=50" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Method 4: Using a Browser

Simply open the URL in your browser:

```
http://localhost:3000/api/cron/fetch-events?city=Cape Town&size=20
```

**Note:** If `CRON_SECRET` is set, you'll need to add it as a query parameter or use a browser extension to add the Authorization header.

## Method 5: Using PowerShell (Windows)

```powershell
# Basic request
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/fetch-events?city=Cape Town&size=20" -Method GET

# With authentication
$headers = @{
    "Authorization" = "Bearer YOUR_CRON_SECRET"
}
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/fetch-events?city=Cape Town&size=50" -Method GET -Headers $headers
```

## Query Parameters

The API endpoint accepts these query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `city` | string | "Cape Town" | City to fetch events for |
| `size` | number | 20 | Number of events to fetch per page |
| `page` | number | 0 | Page number (for pagination) |
| `keyword` | string | - | Search keyword (optional) |

## Expected Response

On success, you'll see:

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

## Troubleshooting

### Error: "TICKETMASTER_API_KEY not configured"

- Check your `.env.local` or `.env` file
- Make sure the variable is named exactly `TICKETMASTER_API_KEY`
- Restart your dev server after adding the variable

### Error: "Unauthorized"

- If you set `CRON_SECRET`, make sure you're including it in the Authorization header
- Format: `Authorization: Bearer YOUR_CRON_SECRET`

### Error: "Failed to fetch events from Ticketmaster"

- Check your API key is valid
- Verify you haven't exceeded rate limits (5 requests/second, 5000/day)
- Check your internet connection

### Error: "Failed to store events in database"

- Verify your Supabase connection is working
- Check that the `ticketmaster_events` table exists (run migrations)
- Ensure RLS policies allow inserts

### Network Error / Connection Refused

- Make sure your Next.js dev server is running (`npm run dev`)
- Check the server is running on port 3000 (or update the script URL)
- Verify `NEXT_PUBLIC_BASE_URL` in your `.env` file matches your local URL

## Verifying Events Were Stored

After running the cron job, you can verify events were stored:

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Table Editor → `ticketmaster_events`
3. You should see the newly fetched events

### Using SQL

```sql
-- Count total events
SELECT COUNT(*) FROM ticketmaster_events;

-- View recent events
SELECT title, city, start_date, segment 
FROM ticketmaster_events 
ORDER BY last_fetched_at DESC 
LIMIT 10;

-- Check last fetch time
SELECT MAX(last_fetched_at) as last_fetch 
FROM ticketmaster_events;
```

### Using the Events Page

1. Start your dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/events-specials`
3. You should see the fetched events displayed

## Setting Up Automatic Local Cron (Optional)

If you want to simulate automatic cron runs locally, you can use `node-cron`:

### Install node-cron

```bash
npm install --save-dev node-cron
```

### Create a cron script

Create `scripts/local-cron.js`:

```javascript
const cron = require('node-cron');
const { exec } = require('child_process');

// Run every 6 hours (same as production)
cron.schedule('0 */6 * * *', () => {
  console.log('Running scheduled events fetch...');
  exec('node scripts/fetch-events.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
});

console.log('Local cron job started. Will run every 6 hours.');
console.log('Press Ctrl+C to stop.');
```

### Run the cron

```bash
node scripts/local-cron.js
```

**Note:** This will run in the foreground. For production, use Vercel Cron or another service.

## Next Steps

- Once events are fetched, they'll appear on your `/events-specials` page
- The cron job will run automatically every 6 hours in production (via Vercel Cron)
- You can manually trigger it anytime using the methods above

