import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * API endpoint to sync profile role with user metadata
 * This is a fallback for cases where the profile was created with default 'user' role
 * but the user actually registered as a business_owner
 */
export async function POST() {
  try {
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
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', synced: false },
        { status: 401 }
      );
    }

    // Get account_type from user metadata
    const userMetadataAccountType = user.user_metadata?.account_type as string | undefined;

    if (!userMetadataAccountType) {
      return NextResponse.json({
        message: 'No account_type in user metadata',
        synced: false,
        metadataAccountType: null
      });
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, account_role')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile', synced: false },
        { status: 500 }
      );
    }

    // Check if sync is needed
    if (profile.role === userMetadataAccountType) {
      return NextResponse.json({
        message: 'Profile already synced',
        synced: false,
        currentRole: profile.role,
        metadataAccountType: userMetadataAccountType
      });
    }

    // Sync profile role with metadata
    console.log('Syncing profile role:', {
      userId: user.id,
      currentRole: profile.role,
      newRole: userMetadataAccountType
    });

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: userMetadataAccountType,
        account_role: userMetadataAccountType,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating profile role:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile role', synced: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Profile role synced successfully',
      synced: true,
      previousRole: profile.role,
      newRole: userMetadataAccountType
    });

  } catch (error) {
    console.error('Error in sync-profile-role:', error);
    return NextResponse.json(
      { error: 'Internal server error', synced: false },
      { status: 500 }
    );
  }
}

