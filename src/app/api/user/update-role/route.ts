import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

export const POST = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const { role } = await req.json();

    if (!role || (role !== 'user' && role !== 'business_owner')) {
      return NextResponse.json({ error: 'Invalid role provided' }, { status: 400 });
    }

    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, account_role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (existingProfile.role === 'business_owner' && role === 'user') {
      return NextResponse.json(
        { error: 'This email is already registered as a Business account. Use a different email for Personal access.' },
        { status: 403 }
      );
    }

    const nextRole = existingProfile.role === 'both' ? 'both' : role;

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({ role: nextRole, account_role: role, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating role:', updateError);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Error in update-role endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
