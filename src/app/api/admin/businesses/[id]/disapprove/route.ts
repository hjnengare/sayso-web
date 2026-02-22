import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/businesses/[id]/disapprove
 * Reject a pending business. It stays hidden and does not go live.
 * Requires admin. Sets status = 'rejected', is_hidden = true, optional reason.
 * Business owners cannot disapprove their own businesses.
 */
export const POST = withAdmin(async (req, { user, service, params }) => {
  try {
    const businessId = (await params).id;
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    let body: { reason?: string; comment?: string } = {};
    try {
      body = await req.json();
    } catch {
      // optional body
    }

    const allowedReasons = [
      'duplicate',
      'incomplete_information',
      'inappropriate_content',
      'other',
    ] as const;
    const reason = typeof body.reason === 'string' ? body.reason.trim().toLowerCase() : '';
    if (!reason || !allowedReasons.includes(reason as (typeof allowedReasons)[number])) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'A valid rejection reason is required. Choose one: Duplicate, Incomplete information, Inappropriate content, Other.',
        },
        { status: 400 }
      );
    }

    const { data: business, error: fetchError } = await (service as any)
      .from('businesses')
      .select('id, status, owner_id')
      .eq('id', businessId)
      .maybeSingle();

    if (fetchError) {
      console.error('[Admin] Error fetching business for disapproval:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch business', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const biz = business as { status?: string; owner_id?: string | null };
    if (biz.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Business is not pending approval' },
        { status: 400 }
      );
    }

    if (biz.owner_id && biz.owner_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot disapprove your own business' },
        { status: 403 }
      );
    }

    const fullReason = body.comment
      ? `${reason}: ${body.comment.trim()}`
      : reason;
    const updatePayload: Record<string, unknown> = {
      status: 'rejected',
      is_hidden: true,
      updated_at: new Date().toISOString(),
      rejection_reason: fullReason,
      rejected_at: new Date().toISOString(),
      rejected_by: user.id,
    };

    const { error: updateError } = await (service as any)
      .from('businesses')
      .update(updatePayload)
      .eq('id', businessId);

    if (updateError) {
      console.error('[Admin] Error disapproving business:', updateError);
      return NextResponse.json(
        { error: 'Failed to disapprove business', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Business disapproved and will not be shown publicly',
      business_id: businessId,
    });
  } catch (error) {
    console.error('[Admin] Error in disapprove business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
