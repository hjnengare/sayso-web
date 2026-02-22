import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

export const POST = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const { newRole } = await req.json();

    if (!['user', 'business_owner'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role === 'user' && newRole === 'business_owner') {
      return NextResponse.json({ error: 'User does not have business_owner role' }, { status: 403 });
    }

    if (profile.role === 'business_owner' && newRole === 'user') {
      return NextResponse.json({ error: 'User does not have user role' }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ account_role: newRole })
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Switched to ${newRole === 'business_owner' ? 'Business' : 'Personal'} mode`
    });
  } catch (error) {
    console.error('Error switching role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
