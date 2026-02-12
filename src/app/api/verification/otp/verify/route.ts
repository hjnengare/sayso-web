import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { isPhoneOtpAutoMode } from '@/app/lib/services/phoneOtpMode';
import { movePhoneClaimToUnderReview } from '@/app/lib/services/phoneOtpFlow';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_ATTEMPTS = 5;

type OtpVerifyErrorCode =
  | 'UNAUTHORIZED'
  | 'CLAIM_ID_REQUIRED'
  | 'OTP_CODE_REQUIRED'
  | 'OTP_CODE_INVALID_FORMAT'
  | 'CLAIM_NOT_FOUND'
  | 'FORBIDDEN'
  | 'OTP_NOT_FOUND_OR_EXPIRED'
  | 'OTP_TOO_MANY_ATTEMPTS'
  | 'OTP_INVALID'
  | 'OTP_AUTO_VERIFY_FAILED'
  | 'OTP_VERIFICATION_FAILED'
  | 'OTP_VERIFY_UNKNOWN_ERROR';

function otpVerifyError(
  status: number,
  code: OtpVerifyErrorCode,
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

function hashOtp(code: string): string {
  const pepper = process.env.OTP_PEPPER || 'dev-pepper-do-not-use-in-production';
  return crypto.createHash('sha256').update(pepper + code).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return otpVerifyError(401, 'UNAUTHORIZED', 'Unauthorized');
    }

    const autoMode = isPhoneOtpAutoMode();
    const body = await req.json().catch(() => ({}));
    const claimId = body.claimId ?? body.claim_id;
    const code = body.code?.toString().trim();

    if (!claimId) {
      return otpVerifyError(400, 'CLAIM_ID_REQUIRED', 'claimId is required');
    }

    if (!autoMode) {
      if (!code) {
        return otpVerifyError(400, 'OTP_CODE_REQUIRED', 'claimId and code are required');
      }
      if (!/^\d{6}$/.test(code)) {
        return otpVerifyError(400, 'OTP_CODE_INVALID_FORMAT', 'Code must be 6 digits');
      }
    }

    const service = getServiceSupabase();

    const { data: claim, error: claimError } = await service
      .from('business_claims')
      .select('id, claimant_user_id, business_id, status')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      return otpVerifyError(404, 'CLAIM_NOT_FOUND', 'Claim not found');
    }
    const claimRow = claim as { claimant_user_id: string; status: string; business_id: string };
    if (claimRow.claimant_user_id !== user.id) {
      return otpVerifyError(403, 'FORBIDDEN', 'You can only verify OTP for your own claim');
    }

    if (autoMode) {
      const autoResult = await movePhoneClaimToUnderReview({
        claimId,
        claimantUserId: claimRow.claimant_user_id,
        businessId: claimRow.business_id,
        source: 'otp_verify',
        autoVerified: true,
      });

      if (!autoResult.ok) {
        const status =
          autoResult.code === 'NOT_FOUND'
            ? 404
            : autoResult.code === 'INVALID_STATUS'
              ? 409
              : 500;
        return otpVerifyError(
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
        message: 'Phone verification completed automatically. Your claim is under review.',
      });
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
      return otpVerifyError(
        400,
        'OTP_NOT_FOUND_OR_EXPIRED',
        'No valid verification code. Please request a new one.'
      );
    }
    const otpRow = otpData as { id: string; attempts: number; code_hash: string };

    const currentAttempts = otpRow.attempts ?? 0;
    if (currentAttempts >= MAX_ATTEMPTS) {
      return otpVerifyError(
        429,
        'OTP_TOO_MANY_ATTEMPTS',
        'Too many attempts. Please request a new code.',
        { maxAttempts: MAX_ATTEMPTS, attemptsUsed: currentAttempts }
      );
    }
    const newAttempts = currentAttempts + 1;

    await (service as any)
      .from('business_claim_otp')
      .update({ attempts: newAttempts })
      .eq('id', otpRow.id);

    const codeHash = hashOtp(code as string);
    if (otpRow.code_hash !== codeHash) {
      return otpVerifyError(
        400,
        'OTP_INVALID',
        'Invalid code',
        {
          maxAttempts: MAX_ATTEMPTS,
          attemptsUsed: newAttempts,
          remainingAttempts: Math.max(0, MAX_ATTEMPTS - newAttempts),
        }
      );
    }

    await (service as any)
      .from('business_claim_otp')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', otpRow.id);

    const moveResult = await movePhoneClaimToUnderReview({
      claimId,
      claimantUserId: claimRow.claimant_user_id,
      businessId: claimRow.business_id,
      source: 'otp_verify',
      autoVerified: false,
    });

    if (!moveResult.ok) {
      const status =
        moveResult.code === 'NOT_FOUND'
          ? 404
          : moveResult.code === 'INVALID_STATUS'
            ? 409
            : 500;
      return otpVerifyError(
        status,
        'OTP_VERIFICATION_FAILED',
        moveResult.message ?? 'Failed to complete phone verification.'
      );
    }

    return NextResponse.json({ ok: true, code: 'OTP_VERIFIED', status: 'under_review' });
  } catch (err) {
    console.error('OTP verify error:', err);
    return otpVerifyError(500, 'OTP_VERIFY_UNKNOWN_ERROR', 'Something went wrong');
  }
}
