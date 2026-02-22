import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';
import { SUBCATEGORY_TO_INTEREST } from '../../../lib/onboarding/subcategoryMapping';

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SubcategoryPayload {
  subcategory_id: string;
  interest_id: string;
}

function normalizeSubcategoryEntry(entry: unknown): { subcategoryId: string; interestId?: string } {
  if (typeof entry === 'string') {
    return { subcategoryId: entry.trim() };
  }

  if (entry && typeof entry === 'object') {
    const obj = entry as Record<string, unknown>;
    const subcategoryId = String(obj.subcategory_id ?? obj.id ?? '').trim();
    const interestId = String(obj.interest_id ?? obj.interestId ?? '').trim();
    return { subcategoryId, interestId: interestId || undefined };
  }

  return { subcategoryId: '' };
}

/**
 * POST /api/onboarding/subcategories
 * Saves subcategories and advances onboarding_step to 'deal-breakers' — requires auth
 */
export const POST = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const body = await req.json();
    const subcategories = body?.subcategories ?? body?.subcategory_ids;

    if (!subcategories || !Array.isArray(subcategories)) {
      const response = NextResponse.json(
        { error: 'Subcategories must be an array' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    if (subcategories.length < 1) {
      const response = NextResponse.json(
        { error: 'Please select at least 1 subcategory' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    if (subcategories.length > 10) {
      const response = NextResponse.json(
        { error: 'Maximum 10 subcategories allowed' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    const { data: interestsData, error: interestsError } = await supabase
      .from('user_interests')
      .select('interest_id')
      .eq('user_id', user.id);

    if (interestsError) {
      console.error('[Subcategories API] Error loading interests:', interestsError);
      return addNoCacheHeaders(
        NextResponse.json({ error: 'Failed to verify interests' }, { status: 500 })
      );
    }

    if (!interestsData || interestsData.length === 0) {
      return addNoCacheHeaders(
        NextResponse.json({ error: 'Complete interests first' }, { status: 400 })
      );
    }

    const interestSet = new Set(interestsData.map((row) => row.interest_id));
    const subcategoryMap = new Map<string, SubcategoryPayload>();
    const invalidSubcategories: string[] = [];
    const mismatchedInterests: string[] = [];
    const emptySubcategories: number[] = [];

    subcategories.forEach((entry: unknown, index: number) => {
      const { subcategoryId, interestId } = normalizeSubcategoryEntry(entry);
      if (!subcategoryId) {
        emptySubcategories.push(index);
        return;
      }

      const mappedInterestId = interestId || SUBCATEGORY_TO_INTEREST[subcategoryId];

      if (!mappedInterestId) {
        invalidSubcategories.push(subcategoryId);
        return;
      }

      if (!interestSet.has(mappedInterestId)) {
        mismatchedInterests.push(subcategoryId);
        return;
      }

      subcategoryMap.set(subcategoryId, {
        subcategory_id: subcategoryId,
        interest_id: mappedInterestId
      });
    });

    if (emptySubcategories.length > 0) {
      return addNoCacheHeaders(
        NextResponse.json(
          { error: 'All subcategories must be non-empty strings' },
          { status: 400 }
        )
      );
    }

    if (invalidSubcategories.length > 0) {
      return addNoCacheHeaders(
        NextResponse.json(
          { error: `Invalid subcategory IDs: ${invalidSubcategories.join(', ')}` },
          { status: 400 }
        )
      );
    }

    if (mismatchedInterests.length > 0) {
      return addNoCacheHeaders(
        NextResponse.json(
          { error: 'Subcategories must belong to selected interests' },
          { status: 400 }
        )
      );
    }

    const subcategoryData = Array.from(subcategoryMap.values());

    if (subcategoryData.length === 0) {
      return addNoCacheHeaders(
        NextResponse.json(
          { error: 'No valid subcategories provided' },
          { status: 400 }
        )
      );
    }

    const rpcResult = await supabase.rpc('replace_user_subcategories', {
      p_user_id: user.id,
      p_subcategory_data: subcategoryData
    });

    if (rpcResult.error) {
      console.warn('[Subcategories API] RPC failed, falling back to direct writes:', rpcResult.error.message);

      const { error: deleteError } = await supabase
        .from('user_subcategories')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('[Subcategories API] Error clearing subcategories:', deleteError);
        const errResponse = NextResponse.json({ error: 'Failed to save subcategories', message: deleteError.message }, { status: 500 });
        return addNoCacheHeaders(errResponse);
      }

      const rows = subcategoryData.map((item) => ({
        user_id: user.id,
        subcategory_id: item.subcategory_id,
        interest_id: item.interest_id
      }));

      const { error: insertError } = await supabase
        .from('user_subcategories')
        .insert(rows);

      if (insertError) {
        console.error('[Subcategories API] Error inserting subcategories:', insertError);
        const errResponse = NextResponse.json({ error: 'Failed to save subcategories', message: insertError.message }, { status: 500 });
        return addNoCacheHeaders(errResponse);
      }

      // CRITICAL: When RPC fails, we must atomically update profile with subcategories_count AND onboarding_step.
      // The RPC normally does this; fallback must not forget subcategories_count.
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subcategories_count: subcategoryData.length,
          onboarding_step: 'deal-breakers',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[Subcategories API] Error updating profile:', updateError);
        const errResponse = NextResponse.json({ error: 'Failed to save subcategories', message: updateError.message }, { status: 500 });
        return addNoCacheHeaders(errResponse);
      }
    }

    const response = NextResponse.json({ ok: true });
    return addNoCacheHeaders(response);

  } catch (error: any) {
    console.error('[Subcategories API] Unexpected error:', error);
    const response = NextResponse.json(
      {
        error: 'Failed to save subcategories',
        message: error.message
      },
      { status: 500 }
    );
    return addNoCacheHeaders(response);
  }
});
