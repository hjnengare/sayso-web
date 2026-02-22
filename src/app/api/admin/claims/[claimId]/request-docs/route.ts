import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/app/api/_lib/withAuth';
import { EmailService } from '@/app/lib/services/emailService';
import { createClaimNotification, updateClaimLastNotified } from '@/app/lib/claimNotifications';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withAdmin(async (
  req: NextRequest,
  { service, params }
) => {
  const claimId = (await params)?.claimId;
  if (!claimId) {
    return NextResponse.json({ error: 'claimId required' }, { status: 400 });
  }

  const { data: claim, error: claimError } = await service
    .from('business_claims')
    .select('id, claimant_user_id, business_id, status')
    .eq('id', claimId)
    .single();

  if (claimError || !claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }
  const claimRow = claim as { id: string; claimant_user_id: string; business_id: string; status: string };

  await (service as any)
    .from('business_claims')
    .update({
      status: 'action_required',
      method_attempted: 'document',
      updated_at: new Date().toISOString(),
    })
    .eq('id', claimId);

  const { data: business } = await service.from('businesses').select('name').eq('id', claimRow.business_id).single();
  const claimantId = claimRow.claimant_user_id;
  const { data: profile } = await service.from('profiles').select('display_name, username').eq('user_id', claimantId).maybeSingle();

  let recipientEmail: string | undefined;
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: authUser } = await admin.auth.admin.getUserById(claimantId);
    recipientEmail = authUser?.user?.email ?? undefined;
  } catch {
    // ignore
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const claimBusinessUrl = `${baseUrl}/claim-business`;
  const businessName: string = (business as { name?: string } | null)?.name ?? 'Your business';

  await createClaimNotification({
    userId: claimantId,
    claimId,
    type: 'docs_requested',
    title: 'Documents required',
    message: `We need additional documents to verify your claim for ${businessName}. Please upload them in your claim page.`,
    link: '/claim-business',
  });
  updateClaimLastNotified(claimId).catch(() => {});

  if (recipientEmail) {
    const recipientName = (profile as { display_name?: string; username?: string } | null)?.display_name
      || (profile as { display_name?: string; username?: string } | null)?.username;
    EmailService.sendDocsRequestedEmail({
      recipientEmail,
      recipientName: recipientName as string | undefined,
      businessName,
      claimBusinessUrl,
    }).catch((err) => console.error('Docs requested email failed:', err));
  }

  return NextResponse.json({ success: true, message: 'Documents requested; claimant notified.' });
});
