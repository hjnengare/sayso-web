import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { performance as nodePerformance } from 'perf_hooks';

/**
 * POST /api/onboarding/deal-breakers
 * Saves dealbreakers to user_dealbreakers table and updates onboarding_step
 */
export async function POST(req: Request) {
  const startTime = nodePerformance.now();
  
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealbreakers } = await req.json();

    if (!dealbreakers || !Array.isArray(dealbreakers) || dealbreakers.length === 0) {
      return NextResponse.json(
        { error: 'Dealbreakers array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate all dealbreaker IDs are strings
    const validDealbreakers = Array.from(new Set(
      dealbreakers
        .filter((id: any) => typeof id === 'string' && id.trim().length > 0)
        .map((id: string) => id.trim())
    ));

    if (validDealbreakers.length === 0) {
      return NextResponse.json(
        { error: 'No valid dealbreakers provided' },
        { status: 400 }
      );
    }

    const writeStart = nodePerformance.now();

    // Save dealbreakers to user_dealbreakers table using RPC function
    const { error: dealbreakersError } = await supabase.rpc('replace_user_dealbreakers', {
      p_user_id: user.id,
      p_dealbreaker_ids: validDealbreakers
    });

    if (dealbreakersError) {
      console.error('[Deal-breakers API] Error saving dealbreakers:', dealbreakersError);
      // Fallback to manual insert if RPC doesn't exist
      if (dealbreakersError.message?.includes('function') || dealbreakersError.message?.includes('does not exist')) {
        console.log('[Deal-breakers API] RPC function not found, using fallback method');
        
        // Delete existing dealbreakers
        const { error: deleteError } = await supabase
          .from('user_dealbreakers')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('[Deal-breakers API] Error deleting existing dealbreakers:', deleteError);
          throw deleteError;
        }

        // Insert new dealbreakers
        if (validDealbreakers.length > 0) {
          const rows = validDealbreakers.map((dealbreaker_id: string) => ({
            user_id: user.id,
            dealbreaker_id: dealbreaker_id.trim()
          }));

          const { error: insertError } = await supabase
            .from('user_dealbreakers')
            .insert(rows);

          if (insertError) {
            console.error('[Deal-breakers API] Error inserting dealbreakers:', insertError);
            throw insertError;
          }

          // Update profile counts manually
          await supabase
            .from('profiles')
            .update({
              dealbreakers_count: validDealbreakers.length,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        }
      } else {
        throw dealbreakersError;
      }
    }

    // Update onboarding_step to complete
    const { error: stepError } = await supabase
      .from('profiles')
      .update({
        onboarding_step: 'complete',
        dealbreakers_count: validDealbreakers.length,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (stepError) {
      console.error('[Deal-breakers API] Error updating onboarding_step:', stepError);
      throw stepError;
    }

    const writeTime = nodePerformance.now() - writeStart;
    const totalTime = nodePerformance.now() - startTime;

    console.log('[Deal-breakers API] Dealbreakers saved successfully', {
      userId: user.id,
      dealbreakersCount: validDealbreakers.length,
      writeTime: `${writeTime.toFixed(2)}ms`,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    return NextResponse.json({
      ok: true,
      dealbreakersCount: validDealbreakers.length,
      onboarding_step: 'complete', // Return updated step for immediate UI update
      performance: {
        writeTime: writeTime,
        totalTime: totalTime
      }
    });

  } catch (error: any) {
    const totalTime = nodePerformance.now() - startTime;
    console.error('[Deal-breakers API] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save dealbreakers',
        message: error.message,
        performance: { totalTime }
      },
      { status: 500 }
    );
  }
}

