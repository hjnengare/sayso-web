import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { TicketmasterService } from '@/app/lib/services/ticketmasterService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max duration

/**
 * GET /api/cron/fetch-events
 * Cron job endpoint to fetch events from Ticketmaster API and store them in the database
 * 
 * NOTE: Primary cron job is now handled by Supabase Edge Function via pg_cron
 * See: supabase/migrations/20250107_setup_edge_function_cron_simple.sql
 * 
 * This endpoint is kept as a backup/manual trigger option.
 * 
 * Environment variables required:
 * - TICKETMASTER_API_KEY: Your Ticketmaster API key
 * - CRON_SECRET: Secret key to protect this endpoint (optional but recommended)
 * 
 * Query parameters:
 * - keyword: Search keyword (optional)
 * - city: Filter by city (optional, defaults to 'Cape Town')
 * - size: Number of events per page (optional, defaults to 20)
 * - page: Page number (optional, defaults to 0)
 */
export async function GET(req: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error('[Cron] TICKETMASTER_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'TICKETMASTER_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get('keyword') || undefined;
    const city = searchParams.get('city') || 'Cape Town'; // Default to Cape Town
    const size = parseInt(searchParams.get('size') || '20', 10);
    const page = parseInt(searchParams.get('page') || '0', 10);

    console.log('[Cron] Fetching events from Ticketmaster:', {
      keyword,
      city,
      size,
      page,
    });

    // Get Supabase client
    const supabase = await getServerSupabase();

    // Fetch and store events using the service
    const result = await TicketmasterService.fetchAndStoreEvents(supabase, apiKey, {
      keyword,
      city,
      size,
      page,
    });

    console.log('[Cron] Events fetch completed:', result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Cron] Error fetching events:', {
      message: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

