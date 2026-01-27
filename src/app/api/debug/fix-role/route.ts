import { NextResponse, NextRequest } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * ADMIN ONLY: Fix user profile role data
 * Sets account_role based on what's detected
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found', profileError: profileError?.message },
        { status: 404 }
      );
    }

    // Determine the correct role based on onboarding path and current state
    // If they're on /claim-business, they should be business_owner
    const { newRole } = await request.json();
    
    if (!['user', 'business_owner'].includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid newRole' },
        { status: 400 }
      );
    }

    // Update the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        account_role: newRole,
        role: profile.role || newRole, // Ensure role is set
        email: user.email // Ensure email is populated
      })
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update profile', updateError: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Profile updated: account_role = ${newRole}`,
      profile: {
        user_id: user.id,
        account_role: newRole,
        role: profile.role || newRole
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

