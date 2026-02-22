import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

type NormalizedRole = 'admin' | 'business_owner' | 'user';

function normalizeRole(value: string | null | undefined): NormalizedRole | null {
  const role = String(value || '').toLowerCase().trim();
  if (!role) return null;

  if (role === 'admin' || role === 'super_admin' || role === 'superadmin') {
    return 'admin';
  }

  if (role === 'business_owner' || role === 'business' || role === 'owner') {
    return 'business_owner';
  }

  if (role === 'user' || role === 'personal') {
    return 'user';
  }

  return null;
}

/**
 * API endpoint to sync profile role with user metadata
 * This is a fallback for cases where the profile was created with default 'user' role
 * but the user actually registered as a business_owner
 */
export const POST = withUser(async (_req: NextRequest, { user, supabase }) => {
  try {
    // Get account_type/role from user metadata
    let userMetadataAccountType = normalizeRole(
      (user.user_metadata?.account_type as string | undefined) ||
      (user.user_metadata?.role as string | undefined) ||
      (user.app_metadata?.role as string | undefined)
    );

    if (!userMetadataAccountType) {
      userMetadataAccountType = 'user';
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, account_role, onboarding_completed_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile', synced: false },
        { status: 500 }
      );
    }

    if (!profile) {
      // Profile race condition fix: create profile if missing right after session establishment.
      const insertPayload: Record<string, unknown> = {
        user_id: user.id,
        role: userMetadataAccountType,
        account_role: userMetadataAccountType,
        updated_at: new Date().toISOString(),
      };

      if (userMetadataAccountType === 'business_owner') {
        insertPayload.onboarding_step = 'business_setup';
      }

      const { error: insertError } = await supabase
        .from('profiles')
        .upsert(insertPayload, { onConflict: 'user_id' });

      if (insertError) {
        console.error('Error creating missing profile:', insertError);
        return NextResponse.json(
          { error: 'Failed to create profile', synced: false },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Profile created and role synced successfully',
        synced: true,
        previousRole: null,
        newRole: userMetadataAccountType
      });
    }

    // Check if sync is needed
    if (normalizeRole(profile.role) === userMetadataAccountType && normalizeRole(profile.account_role) === userMetadataAccountType) {
      return NextResponse.json({
        message: 'Profile already synced',
        synced: false,
        currentRole: profile.role,
        metadataAccountType: userMetadataAccountType
      });
    }

    // Sync profile role with metadata.
    // CRITICAL: Only update role/account_role. NEVER touch onboarding fields during sync:
    // onboarding_step, interests_count, subcategories_count, onboarding_completed_at.
    // This endpoint is idempotent for role sync and must not reset onboarding progress.
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
});
