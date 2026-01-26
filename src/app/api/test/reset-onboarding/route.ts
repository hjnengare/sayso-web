import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/test/reset-onboarding
 *
 * Test-only endpoint to reset or set onboarding state.
 * Used by Playwright tests to ensure deterministic test behavior.
 *
 * Request body:
 * - email: string (required) - User email to reset
 * - complete: boolean (optional) - If true, marks onboarding as complete
 *
 * Examples:
 *   Reset to incomplete: { "email": "test@example.com" }
 *   Set as complete:     { "email": "test@example.com", "complete": true }
 */
export async function POST(req: Request) {
  // Runtime check - only allow in development/test
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_ROUTES) {
    return NextResponse.json(
      { error: 'Test routes are not available in production' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { email, complete = false } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate service role key exists
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: missing service role key' },
        { status: 500 }
      );
    }

    // Create admin client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get user by email
    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();

    if (userError || !usersData.users) {
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }

    const user = usersData.users.find((u: any) => u.email === email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user.id;

    if (complete) {
      // ============================================
      // SET ONBOARDING AS COMPLETE
      // For testing the "completed user never sees onboarding" flow
      // ============================================
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_complete: true,
          onboarding_step: 'complete',
          current_role: 'user',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileError) {
        console.error('[Test API] Profile update error:', profileError);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        message: 'Onboarding marked as complete',
        state: { onboarding_complete: true }
      });

    } else {
      // ============================================
      // RESET ONBOARDING TO INCOMPLETE
      // For testing the "incomplete user must complete onboarding" flow
      // ============================================

      // 1. Reset profile state
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_complete: false,
          onboarding_step: 'interests',
          interests_count: 0,
          subcategories_count: 0,
          dealbreakers_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileError) {
        console.error('[Test API] Profile update error:', profileError);
        return NextResponse.json({ error: 'Failed to reset profile' }, { status: 500 });
      }

      // 2. Delete user interests (ignore errors - table may not exist in test DB)
      await supabase.from('user_interests').delete().eq('user_id', userId);

      // 3. Delete user subcategories
      await supabase.from('user_subcategories').delete().eq('user_id', userId);

      // 4. Delete user dealbreakers
      await supabase.from('user_dealbreakers').delete().eq('user_id', userId);

      return NextResponse.json({
        ok: true,
        message: 'Onboarding reset to incomplete',
        state: { onboarding_complete: false, onboarding_step: 'interests' }
      });
    }

  } catch (error) {
    console.error('[Test API] Reset onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
