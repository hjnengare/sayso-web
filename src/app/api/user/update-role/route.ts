import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { role } = await request.json();

    if (!role || (role !== 'user' && role !== 'business_owner')) {
      return NextResponse.json(
        { error: 'Invalid role provided' },
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

    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, account_role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Prevent downgrading a business-only account to personal with the same email
    if (existingProfile.role === 'business_owner' && role === 'user') {
      return NextResponse.json(
        { error: 'This email is already registered as a Business account. Use a different email for Personal access.' },
        { status: 403 }
      );
    }

    // Preserve dual-role accounts while updating active role
    const nextRole = existingProfile.role === 'both' ? 'both' : role;

    // Update user's role in profiles table
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({
        role: nextRole,
        account_role: role,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating role:', updateError);
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('Error in update-role endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

