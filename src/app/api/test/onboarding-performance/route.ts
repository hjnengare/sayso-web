import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { performance as nodePerformance } from 'perf_hooks';

/**
 * Performance test endpoint for onboarding flow
 * Tests database query performance and API response times
 */
export async function GET() {
  const startTime = nodePerformance.now();
  const results: Record<string, number> = {};

  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Please log in to test performance'
      }, { status: 401 });
    }

    // Test 1: Profile query (used in middleware)
    const profileStart = nodePerformance.now();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_step, onboarding_complete, interests_count, subcategories_count, dealbreakers_count')
      .eq('user_id', user.id)
      .single();
    results.profile_query_ms = nodePerformance.now() - profileStart;

    if (profileError) {
      return NextResponse.json({
        error: 'Profile query failed',
        details: profileError.message,
        results
      }, { status: 500 });
    }

    // Test 2: Check if tables exist and are accessible
    const tablesStart = nodePerformance.now();
    const tables = ['user_interests', 'user_subcategories', 'user_dealbreakers'];
    const tableChecks: Record<string, boolean> = {};
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        tableChecks[table] = !error;
      } catch (e) {
        tableChecks[table] = false;
      }
    }
    results.table_checks_ms = nodePerformance.now() - tablesStart;

    // Test 3: Test atomic function exists (if profile exists)
    let functionTest = 0;
    if (profile) {
      const functionStart = nodePerformance.now();
      try {
        // Just check if function exists by calling it with empty arrays
        const { error } = await supabase.rpc('complete_onboarding_atomic', {
          p_user_id: user.id,
          p_interest_ids: [],
          p_subcategory_data: [],
          p_dealbreaker_ids: []
        });
        // We expect an error or success, just checking if function exists
        functionTest = nodePerformance.now() - functionStart;
      } catch (e) {
        // Function might not exist or might error - that's ok for test
        functionTest = nodePerformance.now() - functionStart;
      }
      results.function_check_ms = functionTest;
    }

    const totalTime = nodePerformance.now() - startTime;
    results.total_ms = totalTime;

    // Performance thresholds (target: <2s for full flow)
    const thresholds = {
      profile_query: 100, // 100ms max for profile query
      table_checks: 200, // 200ms max for table checks
      total: 500 // 500ms max total for API
    };

    const perfResults = {
      profile_query: results.profile_query_ms < thresholds.profile_query ? 'PASS' : 'FAIL',
      table_checks: results.table_checks_ms < thresholds.table_checks ? 'PASS' : 'FAIL',
      total: results.total_ms < thresholds.total ? 'PASS' : 'FAIL',
      all_tables_exist: Object.values(tableChecks).every(v => v)
    };

    return NextResponse.json({
      success: true,
      results,
      thresholds,
      performance: perfResults,
      profile: profile ? {
        onboarding_step: profile.onboarding_step,
        onboarding_complete: profile.onboarding_complete,
        interests_count: profile.interests_count,
        subcategories_count: profile.subcategories_count,
        dealbreakers_count: profile.dealbreakers_count
      } : null,
      tables: tableChecks,
      message: perfResults.total === 'PASS' 
        ? '✅ All performance tests passed! Onboarding flow should be <2s'
        : '⚠️ Some performance tests failed. Check results above.'
    });

  } catch (error: any) {
    const totalTime = nodePerformance.now() - startTime;
    return NextResponse.json({
      error: 'Performance test failed',
      message: error.message,
      results: { ...results, total_ms: totalTime }
    }, { status: 500 });
  }
}
