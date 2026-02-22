import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';
import { getServiceSupabase } from '@/app/lib/admin';
import { isAdmin } from '@/app/lib/admin';
import { sendSms, maskPhoneE164 } from '@/app/lib/services/smsService';
import { EmailService } from '@/app/lib/services/emailService';
import { createClaimNotification, updateClaimLastNotified } from '@/app/lib/claimNotifications';
import { isPhoneOtpAutoMode } from '@/app/lib/services/phoneOtpMode';
import { movePhoneClaimToUnderReview } from '@/app/lib/services/phoneOtpFlow';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const OTP_EXPIRY_SECONDS = 600; // 10 min
const MAX_SENDS_PER_30_MIN = 3;
const RESEND_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = 6;

type OtpSendErrorCode =
  | 'UNAUTHORIZED'
  | 'CLAIM_ID_REQUIRED'
  | 'CLAIM_NOT_FOUND'
  | 'FORBIDDEN'
  | 'PHONE_VERIFICATION_UNAVAILABLE'
  | 'OTP_SEND_RATE_LIMITED'
  | 'OTP_CREATE_FAILED'
  | 'OTP_SMS_SEND_FAILED'
  | 'OTP_AUTO_VERIFY_FAILED'
  | 'OTP_SEND_UNKNOWN_ERROR';

function otpSendError(
  status: number,
  code: OtpSendErrorCode,
  message: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      code,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

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

export const POST = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const body = await req.json().catch(() => ({}));
    const claimId = body.claimId ?? body.claim_id;
    if (!claimId || typeof claimId !== 'string') {
      return otpSendError(400, 'CLAIM_ID_REQUIRED', 'claimId is required');
    }

    const service = getServiceSupabase();

    const { data: claim, error: claimError } = await service
      .from('business_claims')
      .select('id, claimant_user_id, business_id, status')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      return otpSendError(404, 'CLAIM_NOT_FOUND', 'Claim not found');
    }
    const claimRow = claim as { claimant_user_id: string; business_id: string };

    const isClaimant = claimRow.claimant_user_id === user.id;
    const userIsAdmin = await isAdmin(user.id);
    if (!isClaimant && !userIsAdmin) {
      return otpSendError(403, 'FORBIDDEN', 'You can only send OTP for your own claim');
    }

    if (isPhoneOtpAutoMode()) {
      const autoResult = await movePhoneClaimToUnderReview({
        claimId,
        claimantUserId: claimRow.claimant_user_id,
        businessId: claimRow.business_id,
        source: 'otp_send',
        autoVerified: true,
      });

      if (!autoResult.ok) {
        const status =
          autoResult.code === 'NOT_FOUND'
            ? 404
            : autoResult.code === 'INVALID_STATUS'
              ? 409
              : 500;
        return otpSendError(
          status,
          'OTP_AUTO_VERIFY_FAILED',
          autoResult.message ?? 'Failed to auto-verify phone OTP.'
        );
      }

      return NextResponse.json({
        ok: true,
        code: 'OTP_AUTO_VERIFIED',
        autoVerified: true,
        status: 'under_review',
        maskedPhone: null,
        expiresInSeconds: 0,
        expiresAt: null,
        resendCooldownSeconds: 0,
        message: 'Phone verification completed automatically. Your claim is under review.',
      });
    }

    if (isPhoneOtpAutoMode()) {
      const autoResult = await movePhoneClaimToUnderReview({
        claimId,
        claimantUserId: claimRow.claimant_user_id,
        businessId: claimRow.business_id,
        source: 'otp_send',
        autoVerified: true,
      });

      if (!autoResult.ok) {
        const status =
          autoResult.code === 'NOT_FOUND'
            ? 404
            : autoResult.code === 'INVALID_STATUS'
              ? 409
              : 500;
        return NextResponse.json(
          { error: autoResult.message ?? 'Failed to auto-verify phone OTP.' },
          { status }
        );
      }

      return NextResponse.json({
        ok: true,
        autoVerified: true,
        status: 'under_review',
        maskedPhone: null,
        expiresInSeconds: 0,
        message: 'Phone verification completed automatically. Your claim is under review.',
      });
    }

    const { data: business, error: bizError } = await service
      .from('businesses')
      .select('id, name, phone')
      .eq('id', claimRow.business_id)
      .single();

    if (bizError || !business) {
      return otpSendError(
        400,
        'PHONE_VERIFICATION_UNAVAILABLE',
        'Business phone number is required for phone verification'
      );
    }
    const businessRow = business as { id: string; name: string; phone: string };
    if (!businessRow.phone?.trim()) {
      return otpSendError(
        400,
        'PHONE_VERIFICATION_UNAVAILABLE',
        'Business phone number is required for phone verification'
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
      return otpSendError(
        429,
        'OTP_SEND_RATE_LIMITED',
        'Too many OTP requests. Please try again in 30 minutes.',
        { windowMinutes: 30, maxSends: MAX_SENDS_PER_30_MIN }
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
      return otpSendError(
        500,
        'OTP_CREATE_FAILED',
        'Failed to create verification code'
      );
    }

    const smsResult = await sendSms({
      toE164: phoneE164,
      body: `Your SaySo verification code is ${code}. It expires in 10 minutes.`,
    });
    if (!smsResult.success) {
      return otpSendError(
        502,
        'OTP_SMS_SEND_FAILED',
        'Failed to send SMS. Please try again later.'
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
      code: 'OTP_SENT',
      maskedPhone,
      expiresInSeconds: OTP_EXPIRY_SECONDS,
      expiresAt,
      resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
    });
  } catch (err) {
    console.error('OTP send error:', err);
    return otpSendError(500, 'OTP_SEND_UNKNOWN_ERROR', 'Something went wrong');
  }
});
