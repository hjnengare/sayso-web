import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/admin';

/**
 * Normalize business name: LOWER(TRIM(single spaces))
 * Matches DB trigger and API POST logic.
 */
function normalizeBusinessName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * GET /api/businesses/check-name
 * Check if a business name is available (no duplicate for non-chain businesses).
 * Query params: name (required), isChain (optional, default false), excludeId (optional) — exclude this business ID (for edit/review).
 * Returns: { available: boolean } — false if duplicate exists for non-chain.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const isChain = searchParams.get('isChain') === 'true';
    const excludeId = searchParams.get('excludeId') || undefined;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required', available: true },
        { status: 400 }
      );
    }

    // Chains are allowed to have duplicate names
    if (isChain) {
      return NextResponse.json({ available: true });
    }

    const normalizedName = normalizeBusinessName(name);
    const supabase = getServiceSupabase();
    let query = (supabase as any)
      .from('businesses')
      .select('id')
      .eq('normalized_name', normalizedName)
      .eq('is_chain', false)
      .neq('status', 'rejected');
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    const { data: existing, error } = await query.maybeSingle();

    if (error) {
      console.warn('[API] check-name error:', error);
      return NextResponse.json(
        { error: 'Check failed', available: true },
        { status: 500 }
      );
    }

    return NextResponse.json({
      available: !existing,
    });
  } catch (err: unknown) {
    console.error('[API] check-name:', err);
    return NextResponse.json(
      { error: 'Check failed', available: true },
      { status: 500 }
    );
  }
}
