import { NextRequest, NextResponse } from "next/server";
import { withUser } from '@/app/api/_lib/withAuth';

export const POST = withUser(async (_req: NextRequest, { user, supabase }) => {
  try {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error deactivating account:', updateError);
      return NextResponse.json(
        { error: 'Failed to deactivate account. Please contact support.' },
        { status: 500 }
      );
    }

    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in deactivate account:', error);
    return NextResponse.json({ error: 'Failed to deactivate account' }, { status: 500 });
  }
});
