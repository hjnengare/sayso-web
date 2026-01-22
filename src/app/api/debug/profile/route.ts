import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await getServerSupabase();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', authError: authError?.message },
        { status: 401 }
      );
    }

    // Get full profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: 'Profile error', profileError: profileError.message, code: profileError.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      profile: profile ? {
        role: profile.role,
        current_role: profile.current_role,
        onboarding_step: profile.onboarding_step,
        email_from_profile: profile.email,
        all_fields: Object.keys(profile)
      } : null
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
