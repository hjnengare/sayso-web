import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { EmailService } from '@/app/lib/services/emailService';
import { createClaimNotification, updateClaimLastNotified } from '@/app/lib/claimNotifications';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_ATTEMPTS = 5;

function hashOtp(code: string): string {
  const pepper = process.env.OTP_PEPPER || 'dev-pepper-do-not-use-in-production';
  return crypto.createHash('sha256').update(pepper + code).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const claimId = body.claimId ?? body.claim_id;
    const code = body.code?.toString().trim();
    if (!claimId || !code) {
      return NextResponse.json({ error: 'claimId and code are required' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Code must be 6 digits' }, { status: 400 });
    }

    const service = getServiceSupabase();

    const { data: claim, error: claimError } = await service
      .from('business_claims')
      .select('id, claimant_user_id, business_id, status')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }
    const claimRow = claim as { claimant_user_id: string; status: string; business_id: string };
    if (claimRow.claimant_user_id !== user.id) {
      return NextResponse.json({ error: 'You can only verify OTP for your own claim' }, { status: 403 });
    }

    const { data: otpData, error: otpError } = await service
      .from('business_claim_otp')
      .select('*')
      .eq('claim_id', claimId)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('last_sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpData) {
      return NextResponse.json({ error: 'No valid verification code. Please request a new one.' }, { status: 400 });
    }
    const otpRow = otpData as { id: string; attempts: number; code_hash: string };

    const currentAttempts = otpRow.attempts ?? 0;
    if (currentAttempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 });
    }
    const newAttempts = currentAttempts + 1;

    await (service as any)
      .from('business_claim_otp')
      .update({ attempts: newAttempts })
      .eq('id', otpRow.id);

    const codeHash = hashOtp(code);
    if (otpRow.code_hash !== codeHash) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    await (service as any)
      .from('business_claim_otp')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', otpRow.id);

    await (service as any)
      .from('business_claims')
      .update({
        status: 'under_review',
        method_attempted: 'phone',
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId);

    const { data: business } = await service.from('businesses').select('name').eq('id', claimRow.business_id).single();
    const claimantId = claimRow.claimant_user_id;
    const { data: profile } = await service.from('profiles').select('display_name, username').eq('user_id', claimantId).maybeSingle();
    let recipientEmail: string | undefined;
    try {
      const { createClient } = await import('@supabase/supabase-js');
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

    let businessDisplayName: string;
    if (business === null || business === undefined) {
      businessDisplayName = 'your business';
    } else {
      const b = business as { name?: string };
      businessDisplayName = b.name ?? 'your business';
    }
    await createClaimNotification({
      userId: claimantId,
      claimId,
      type: 'otp_verified',
      title: 'Phone verified',
      message: `Your phone has been verified for ${businessDisplayName}. We'll review your claim shortly.`,
      link: '/claim-business',
    });
    await createClaimNotification({
      userId: claimantId,
      claimId,
      type: 'claim_status_changed',
      title: 'Claim under review',
      message: `Your claim for ${businessDisplayName} is now under review.`,
      link: '/claim-business',
    });
    updateClaimLastNotified(claimId).catch(() => {});

    if (recipientEmail) {
      let recipientName: string | undefined;
      if (profile === null || profile === undefined) {
        recipientName = undefined;
      } else {
        const p = profile as { display_name?: string; username?: string };
        recipientName = p.display_name ?? p.username ?? undefined;
      }
      let businessName: string;
      if (business === null || business === undefined) {
        businessName = 'Your business';
      } else {
        const b = business as { name?: string };
        businessName = b.name ?? 'Your business';
      }
      EmailService.sendOtpVerifiedEmail({
        recipientEmail,
        recipientName,
        businessName,
      }).catch((err) => console.error('OTP verified email failed:', err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('OTP verify error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
