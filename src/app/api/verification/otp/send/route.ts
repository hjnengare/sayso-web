import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { isAdmin } from '@/app/lib/admin';
import { sendSms, maskPhoneE164 } from '@/app/lib/services/smsService';
import { EmailService } from '@/app/lib/services/emailService';
import { createClaimNotification, updateClaimLastNotified } from '@/app/lib/claimNotifications';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const OTP_EXPIRY_SECONDS = 600; // 10 min
const MAX_SENDS_PER_30_MIN = 3;
const OTP_LENGTH = 6;

function generateOtp(): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[crypto.randomInt(0, digits.length)];
  }
  return code;
}

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
    if (!claimId || typeof claimId !== 'string') {
      return NextResponse.json({ error: 'claimId is required' }, { status: 400 });
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
    const claimRow = claim as { claimant_user_id: string; business_id: string };

    const isClaimant = claimRow.claimant_user_id === user.id;
    const userIsAdmin = await isAdmin(user.id);
    if (!isClaimant && !userIsAdmin) {
      return NextResponse.json({ error: 'You can only send OTP for your own claim' }, { status: 403 });
    }

    const { data: business, error: bizError } = await service
      .from('businesses')
      .select('id, name, phone')
      .eq('id', claimRow.business_id)
      .single();

    if (bizError || !business) {
      return NextResponse.json(
        { error: 'Business phone number is required for phone verification' },
        { status: 400 }
      );
    }
    const businessRow = business as { id: string; name: string; phone: string };
    if (!businessRow.phone?.trim()) {
      return NextResponse.json(
        { error: 'Business phone number is required for phone verification' },
        { status: 400 }
      );
    }
    const phoneE164 = businessRow.phone.trim();

    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count } = await service
      .from('business_claim_otp')
      .select('*', { count: 'exact', head: true })
      .eq('claim_id', claimId)
      .gte('last_sent_at', since);

    if ((count ?? 0) >= MAX_SENDS_PER_30_MIN) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please try again in 30 minutes.' },
        { status: 429 }
      );
    }

    const code = generateOtp();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000).toISOString();

    await (service as any).from('business_claim_otp').update({ verified_at: new Date().toISOString() }).eq('claim_id', claimId).is('verified_at', null);
    const { error: insertError } = await (service as any).from('business_claim_otp').insert({
      claim_id: claimId,
      phone_e164: phoneE164,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
      last_sent_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('OTP insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create verification code' }, { status: 500 });
    }

    const smsResult = await sendSms({
      toE164: phoneE164,
      body: `Your SaySo verification code is ${code}. It expires in 10 minutes.`,
    });
    if (!smsResult.success) {
      return NextResponse.json(
        { error: 'Failed to send SMS. Please try again later.' },
        { status: 502 }
      );
    }

    const maskedPhone = maskPhoneE164(phoneE164);
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

    await createClaimNotification({
      userId: claimantId,
      claimId,
      type: 'otp_sent',
      title: 'Verification code sent',
      message: `We sent a code to ${maskedPhone} for ${businessRow.name}. Enter it in the app.`,
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
      EmailService.sendOtpSentEmail({
        recipientEmail,
        recipientName,
        businessName: businessRow.name,
        maskedPhone,
      }).catch((err) => console.error('OTP sent email failed:', err));
    }

    return NextResponse.json({
      ok: true,
      maskedPhone,
      expiresInSeconds: OTP_EXPIRY_SECONDS,
    });
  } catch (err) {
    console.error('OTP send error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
