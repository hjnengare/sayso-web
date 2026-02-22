import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { isAdmin, getServiceSupabase } from '@/app/lib/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AdminAction = 'dismiss' | 'remove_review' | 'warn';

/**
 * PATCH /api/admin/flags/[id]
 * Admin moderation actions on a flagged review.
 *
 * Body: { action: 'dismiss' | 'remove_review' | 'warn', admin_notes?: string }
 *
 * dismiss       — mark flag as reviewed (false positive / no action needed)
 * remove_review — delete the review and mark flag as reviewed
 * warn          — add admin_notes to flag and mark as reviewed (future: notify author)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await getServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const flagId = params.id;
  if (!flagId) {
    return NextResponse.json({ error: 'Missing flag id' }, { status: 400 });
  }

  let body: { action: AdminAction; admin_notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, admin_notes } = body;
  if (!['dismiss', 'remove_review', 'warn'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Use service client without generic typing for tables not in minimal schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = getServiceSupabase() as any;

  // Fetch the flag to get review_id
  const { data: flag, error: fetchError } = await service
    .from('review_flags')
    .select('id, review_id, status')
    .eq('id', flagId)
    .maybeSingle() as { data: { id: string; review_id: string; status: string } | null; error: unknown };

  if (fetchError || !flag) {
    return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
  }

  if (flag.status !== 'pending') {
    return NextResponse.json({ error: 'Flag already actioned' }, { status: 409 });
  }

  // For remove_review: delete the review (cascades to all flags for that review)
  if (action === 'remove_review') {
    const { error: deleteError } = await service
      .from('reviews')
      .delete()
      .eq('id', flag.review_id) as { error: unknown };

    if (deleteError) {
      console.error('Admin remove_review error:', deleteError);
      return NextResponse.json({ error: 'Failed to remove review' }, { status: 500 });
    }

    // Flags cascade-deleted with the review, so we're done
    return NextResponse.json({ success: true, action });
  }

  // For dismiss / warn: update the flag record
  const { error: updateError } = await service
    .from('review_flags')
    .update({
      status: 'reviewed',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      ...(admin_notes != null ? { admin_notes } : {}),
    })
    .eq('id', flagId) as { error: unknown };

  if (updateError) {
    console.error('Admin flag update error:', updateError);
    return NextResponse.json({ error: 'Failed to update flag' }, { status: 500 });
  }

  return NextResponse.json({ success: true, action });
}
