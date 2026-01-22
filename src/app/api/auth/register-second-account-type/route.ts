import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Endpoint to add a second account type to an existing email.
 * Instead of creating a duplicate auth user, this updates the profile to role='both'
 * and allows the user to switch between modes.
 * 
 * POST /api/auth/register-second-account-type
 * Body: { accountType: 'user' | 'business_owner' }
 */
export async function POST(request: Request) {
  try {
    const { accountType } = await request.json();

    if (!accountType || (accountType !== 'user' && accountType !== 'business_owner')) {
      return NextResponse.json(
        { error: 'Invalid account type' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set(name, value, options as any);
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set(name, '', { ...options, maxAge: 0 } as any);
          },
        },
      }
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get existing profile
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, current_role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const { role } = existingProfile;

    // Check if they already have this account type
    if (role === accountType || role === 'both') {
      return NextResponse.json(
        { error: `You already have a ${accountType === 'user' ? 'Personal' : 'Business'} account` },
        { status: 400 }
      );
    }

    // Update role to 'both' and set current_role to the new type
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'both',
        current_role: accountType,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to add account type' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: `${accountType === 'user' ? 'Personal' : 'Business'} account added successfully`,
    });
  } catch (error) {
    console.error('Error in register-second-account-type endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
