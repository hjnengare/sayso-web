import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runEventCleanup, getTodayUTC } from '@/app/lib/services/eventLifecycle';

// This endpoint should be called by a cron job to clean up expired events
// It requires a secret key for authentication

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for cleanup

/**
 * POST /api/events/cleanup
 *
 * Runs event lifecycle cleanup:
 * - Updates events with past dates to reflect only future dates
 * - Deletes events that have fully expired (all dates in the past)
 *
 * Authentication: Requires CRON_SECRET header or service role key
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication - check for cron secret or admin token
    const cronSecret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
    const expectedSecret = process.env.CRON_SECRET;

    // Also allow Vercel Cron authentication
    const vercelCronAuth = req.headers.get('authorization');
    const isVercelCron = vercelCronAuth === `Bearer ${process.env.CRON_SECRET}`;

    if (!expectedSecret) {
      console.warn('[Events Cleanup] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cleanup endpoint not configured' },
        { status: 503 }
      );
    }

    if (cronSecret !== expectedSecret && !isVercelCron) {
      console.warn('[Events Cleanup] Unauthorized cleanup attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create admin Supabase client with service role key for cleanup operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Events Cleanup] Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log(`[Events Cleanup] Starting cleanup at ${new Date().toISOString()}`);
    console.log(`[Events Cleanup] Today (UTC): ${getTodayUTC().toISOString()}`);

    // Run the cleanup
    const result = await runEventCleanup(supabase);

    console.log('[Events Cleanup] Cleanup completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Event cleanup completed',
      result: {
        eventsProcessed: result.eventsProcessed,
        eventsUpdated: result.eventsUpdated,
        eventsDeleted: result.eventsDeleted,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Events Cleanup] Error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/cleanup
 *
 * Returns cleanup status and last run information
 * Does not require authentication for status check
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/events/cleanup',
    method: 'POST',
    description: 'Cleans up expired events from the database',
    authentication: 'Requires x-cron-secret header or Bearer token',
    today: getTodayUTC().toISOString(),
    actions: [
      'Updates events with past dates to reflect only future dates',
      'Deletes events that have fully expired (all dates in the past)',
    ],
  });
}
