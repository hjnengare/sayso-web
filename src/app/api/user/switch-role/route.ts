import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { newRole } = await request.json();

    // Validate role
    if (!['user', 'business_owner'].includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.delete(name);
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to verify they have this role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check if user has the role they're trying to switch to
    if (profile.role === 'user' && newRole === 'business_owner') {
      return NextResponse.json(
        { error: 'User does not have business_owner role' },
        { status: 403 }
      );
    }

    if (profile.role === 'business_owner' && newRole === 'user') {
      return NextResponse.json(
        { error: 'User does not have user role' },
        { status: 403 }
      );
    }

    // Update current_role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ current_role: newRole })
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Switched to ${newRole === 'business_owner' ? 'Business' : 'Personal'} mode`
    });

  } catch (error) {
    console.error('Error switching role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
