import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { EmailService } from '@/app/lib/services/emailService';
import { businessEmailDomainMatchesWebsite } from '@/app/lib/utils/claimVerification';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// Structured Error Response Helpers
// ============================================================================

type ClaimErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'FORBIDDEN_ACCOUNT'
  | 'MISSING_FIELDS'
  | 'INVALID_BUSINESS_ID'
  | 'INVALID_EMAIL'
  | 'INVALID_PHONE'
  | 'EMAIL_DOMAIN_MISMATCH'
  | 'DUPLICATE_CLAIM'
  | 'ALREADY_OWNER'
  | 'BUSINESS_NOT_FOUND'
  | 'RLS_BLOCKED'
  | 'DB_ERROR'
  | 'SERVER_ERROR';

interface ClaimErrorResponse {
  success: false;
  code: ClaimErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

function errorResponse(
  code: ClaimErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ClaimErrorResponse> {
  return NextResponse.json(
    { success: false, code, message, details },
    { status }
  );
}

// Basic email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Basic phone validation (at least 8 digits)
function isValidPhone(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 8;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isMissingColumnError(
  error: { code?: string; message?: string } | null | undefined,
  columnName: string
): boolean {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? '').toLowerCase();
  return code === '42703' || (message.includes(columnName.toLowerCase()) && message.includes('column'));
}

function isRpcMissingError(error: { code?: string; message?: string } | null | undefined): boolean {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? '').toLowerCase();
  return (
    code === '42883' ||
    code === 'PGRST202' ||
    (message.includes('start_business_claim') &&
      (message.includes('not found') ||
        message.includes('does not exist') ||
        message.includes('function')))
  );
}

/** Map claim status + method to UI status label (spec: Pending Verification, Action Required, Under Review, Verified, Rejected). */
function toDisplayStatus(status: string, methodAttempted: string | null): string {
  if (status === 'verified') return 'Verified';
  if (status === 'rejected') return 'Rejected';
  if (status === 'action_required') return 'Action Required';
  if (status === 'under_review') return 'Under Review';
  if (status === 'pending' || status === 'draft') {
    if (methodAttempted === 'cipc') return 'Under Review';
    if (methodAttempted === 'email' || methodAttempted === 'phone') return 'Action Required';
    return 'Pending Verification';
  }
  return 'Pending Verification';
}

function toNextStep(status: string, methodAttempted: string | null): string {
  if (status === 'verified') return 'dashboard';
  if (status === 'rejected') return 'rejected';
  if (status === 'under_review') return 'under_review';
  if (status === 'action_required') return 'action_required';
  if (status === 'pending' || status === 'draft') {
    if (methodAttempted === 'cipc') return 'under_review';
    if (methodAttempted === 'email' || methodAttempted === 'phone') return 'action_required';
    return 'pending_verification';
  }
  return 'pending_verification';
}

function mapStartClaimFailure(errorMsg: string): {
  code: ClaimErrorCode;
  message: string;
  status: number;
} | null {
  const normalized = errorMsg.toLowerCase();

  if (normalized.includes('already claimed') || normalized.includes('dispute')) {
    return {
      code: 'ALREADY_OWNER',
      message: 'This business is already claimed. Contact support if ownership should be updated.',
      status: 409,
    };
  }

  if (normalized.includes('no contact information')) {
    return {
      code: 'DB_ERROR',
      message: 'This business does not have enough contact information to start verification yet.',
      status: 400,
    };
  }

  if (normalized.includes('not found') || normalized.includes('inactive')) {
    return {
      code: 'BUSINESS_NOT_FOUND',
      message: "We couldn't find that business. Please try again.",
      status: 404,
    };
  }

  if (normalized.includes('already') || normalized.includes('duplicate') || normalized.includes('existing')) {
    return {
      code: 'DUPLICATE_CLAIM',
      message: 'You already have a claim in progress for this business.',
      status: 409,
    };
  }

  return null;
}

type StartClaimResult = {
  success: boolean;
  claim_id?: string;
  existing?: boolean;
  status?: string;
  method_attempted?: string | null;
  error?: string;
};

async function startClaimWithoutRpc(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  businessId: string,
  userId: string
): Promise<{ data: StartClaimResult | null; error: { code?: string; message?: string } | null }> {
  const activeStatuses = ['draft', 'pending', 'action_required', 'under_review'];
  const { data: existingClaim, error: existingClaimError } = await supabase
    .from('business_claims')
    .select('id, status, method_attempted')
    .eq('business_id', businessId)
    .eq('claimant_user_id', userId)
    .in('status', activeStatuses)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingClaimError) {
    return {
      data: null,
      error: existingClaimError,
    };
  }

  if (existingClaim) {
    return {
      data: {
        success: true,
        existing: true,
        claim_id: String(existingClaim.id),
        status: String(existingClaim.status),
        method_attempted:
          existingClaim.method_attempted === null
            ? null
            : String(existingClaim.method_attempted),
      },
      error: null,
    };
  }

  const startedAt = new Date().toISOString();
  const { data: insertedClaim, error: insertError } = await supabase
    .from('business_claims')
    .insert({
      business_id: businessId,
      claimant_user_id: userId,
      status: 'draft',
      verification_data: { started_at: startedAt },
    })
    .select('id, status')
    .single();

  if (insertError) {
    return {
      data: null,
      error: insertError,
    };
  }

  return {
    data: {
      success: true,
      existing: false,
      claim_id: String(insertedClaim.id),
      status: String(insertedClaim.status ?? 'draft'),
      method_attempted: null,
    },
    error: null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);

    // ========================================================================
    // 1. Authentication Check
    // ========================================================================
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(
        'NOT_AUTHENTICATED',
        'Please log in to claim this business.',
        401
      );
    }
    console.log('CLAIM USER:', user?.id);

    // ========================================================================
    // 2. Parse & Validate Request Body
    // ========================================================================
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return errorResponse('MISSING_FIELDS', 'Invalid request data.', 400);
    }
    console.log('CLAIM BODY:', body);

    const business_id = String(body.business_id ?? body.businessId ?? '').trim();
    const roleRaw = String(body.role ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const email = String(body.email ?? body.businessEmail ?? '').trim();
    const note = String(body.note ?? body.notes ?? '').trim();
    const cipc_registration_number = String(
      body.cipc_registration_number ?? body.cipcNumber ?? ''
    ).trim();
    const cipc_company_name = String(
      body.cipc_company_name ?? body.registeredName ?? ''
    ).trim();

    if (!business_id) {
      return errorResponse(
        'MISSING_FIELDS',
        'Business ID is required.',
        400
      );
    }

    if (!isUuid(business_id)) {
      return errorResponse(
        'INVALID_BUSINESS_ID',
        'Business ID format is invalid.',
        400
      );
    }

    // Validate email format if provided
    const trimmedEmail = email;
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      return errorResponse(
        'INVALID_EMAIL',
        'Please enter a valid email address.',
        400
      );
    }

    // Validate phone format if provided
    const trimmedPhone = phone;
    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      return errorResponse(
        'INVALID_PHONE',
        'Please enter a valid phone number (at least 8 digits).',
        400
      );
    }

    // Check that at least one contact method is provided
    const hasCipc = cipc_registration_number?.trim() && cipc_company_name?.trim();
    if (!trimmedEmail && !trimmedPhone && !hasCipc) {
      return errorResponse(
        'MISSING_FIELDS',
        'Please provide a business email, phone number, or CIPC details.',
        400
      );
    }

    const roleVal = ['owner', 'manager'].includes(roleRaw) ? roleRaw : 'owner';

    // ========================================================================
    // 2b. Account Type Check (business accounts only)
    // ========================================================================
    type ProfileRoleRow = {
      role?: string | null;
      account_role?: string | null;
      account_type?: string | null;
    };

    let profileData: ProfileRoleRow | null = null;
    const profileWithAccountType = await supabase
      .from('profiles')
      .select('role, account_role, account_type')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileWithAccountType.error) {
      if (isMissingColumnError(profileWithAccountType.error, 'account_type')) {
        const profileFallback = await supabase
          .from('profiles')
          .select('role, account_role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileFallback.error) {
          console.log('CLAIM ERROR:', profileFallback.error);
          return errorResponse(
            'DB_ERROR',
            'We could not verify your account type right now. Please try again.',
            500,
            {
              db_code: profileFallback.error.code,
              db_message: profileFallback.error.message,
            }
          );
        }

        profileData = (profileFallback.data as ProfileRoleRow | null) ?? null;
      } else {
        console.log('CLAIM ERROR:', profileWithAccountType.error);
        return errorResponse(
          'DB_ERROR',
          'We could not verify your account type right now. Please try again.',
          500,
          {
            db_code: profileWithAccountType.error.code,
            db_message: profileWithAccountType.error.message,
          }
        );
      }
    } else {
      profileData = (profileWithAccountType.data as ProfileRoleRow | null) ?? null;
    }

    const profileRole = String(profileData?.account_role ?? profileData?.role ?? '').toLowerCase();
    const profileAccountType = String(profileData?.account_type ?? '').toLowerCase();
    const metadataAccountType = String(user.user_metadata?.account_type ?? '').toLowerCase();
    const isBusinessAccount =
      profileRole === 'business_owner' ||
      profileAccountType === 'business' ||
      metadataAccountType === 'business' ||
      metadataAccountType === 'business_owner';

    if (!isBusinessAccount) {
      return errorResponse(
        'FORBIDDEN_ACCOUNT',
        'Business claims are only available while using a business account.',
        403,
        {
          account_role: profileRole || null,
          account_type: profileAccountType || metadataAccountType || null,
        }
      );
    }

    // ========================================================================
    // 3. Check Business Exists
    // ========================================================================
    const { data: businessRow, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', business_id)
      .maybeSingle();

    if (businessError) {
      console.error('[Claim API] Business lookup error:', businessError);
      console.log('CLAIM ERROR:', businessError);
      return errorResponse(
        'DB_ERROR',
        "We couldn't process your claim right now. Please try again.",
        500,
        {
          db_code: businessError.code,
          db_message: businessError.message,
        }
      );
    }

    if (!businessRow) {
      return errorResponse(
        'BUSINESS_NOT_FOUND',
        "We couldn't find that business. Please try again.",
        404
      );
    }

    // ========================================================================
    // 4. Check if User Already Owns This Business
    // ========================================================================
    if (businessRow.owner_id === user.id) {
      return errorResponse(
        'ALREADY_OWNER',
        'You already own this business.',
        409
      );
    }

    const { data: existingOwner, error: ownerCheckError } = await supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (ownerCheckError) {
      console.error('[Claim API] Owner check error:', ownerCheckError);
      console.log('CLAIM ERROR:', ownerCheckError);
    }

    if (existingOwner) {
      return errorResponse(
        'ALREADY_OWNER',
        'You already own this business.',
        409
      );
    }

    // ========================================================================
    // 5. Start or Get Existing Claim
    // ========================================================================
    const { data: rpcStartResult, error: rpcStartError } = await supabase.rpc('start_business_claim', {
      p_business_id: business_id,
      p_claimant_user_id: user.id,
    });

    let start: StartClaimResult | null = (rpcStartResult as StartClaimResult | null) ?? null;

    if (rpcStartError) {
      console.error('[Claim API] start_business_claim RPC error:', rpcStartError);
      console.log('CLAIM ERROR:', rpcStartError);

      // Some environments miss this RPC; fallback to direct table insert.
      if (isRpcMissingError(rpcStartError)) {
        const fallbackStart = await startClaimWithoutRpc(supabase, business_id, user.id);
        if (fallbackStart.error) {
          console.error('[Claim API] fallback start claim error:', fallbackStart.error);
          console.log('CLAIM ERROR:', fallbackStart.error);

          if (fallbackStart.error.code === '42501') {
            return errorResponse(
              'RLS_BLOCKED',
              "You don't have permission to create a claim for this account.",
              403,
              {
                db_code: fallbackStart.error.code,
                db_message: fallbackStart.error.message,
              }
            );
          }

          if (fallbackStart.error.code === '23505') {
            return errorResponse(
              'DUPLICATE_CLAIM',
              'You already have a claim in progress for this business.',
              409,
              {
                db_code: fallbackStart.error.code,
                db_message: fallbackStart.error.message,
              }
            );
          }

          return errorResponse(
            'DB_ERROR',
            "We couldn't start your claim right now. Please try again.",
            500,
            {
              db_code: fallbackStart.error.code,
              db_message: fallbackStart.error.message,
            }
          );
        }

        start = fallbackStart.data;
      } else if (
        rpcStartError.message?.toLowerCase().includes('permission') ||
        rpcStartError.code === '42501'
      ) {
        return errorResponse(
          'RLS_BLOCKED',
          "You don't have permission to create a claim for this account.",
          403,
          {
            db_code: rpcStartError.code,
            db_message: rpcStartError.message,
          }
        );
      } else if (rpcStartError.code === '23505') {
        return errorResponse(
          'DUPLICATE_CLAIM',
          'You already have a claim in progress for this business.',
          409,
          {
            db_code: rpcStartError.code,
            db_message: rpcStartError.message,
          }
        );
      } else if (rpcStartError.code === '22P02') {
        return errorResponse(
          'INVALID_BUSINESS_ID',
          'Business ID format is invalid.',
          400,
          {
            db_code: rpcStartError.code,
            db_message: rpcStartError.message,
          }
        );
      } else {
        return errorResponse(
          'DB_ERROR',
          "We couldn't start your claim right now. Please try again.",
          500,
          {
            db_code: rpcStartError.code,
            db_message: rpcStartError.message,
          }
        );
      }
    }

    if (!start) {
      return errorResponse(
        'DB_ERROR',
        "We couldn't start your claim right now. Please try again.",
        500
      );
    }

    if (!start.success || !start.claim_id) {
      const errorMsg = start.error || '';
      const normalizedError = errorMsg.toLowerCase();

      // If RPC blocks because business listing has no stored contact details,
      // but the claimant provided contact/CIPC data in this request, continue via fallback.
      if (
        normalizedError.includes('no contact information') &&
        (Boolean(trimmedEmail) || Boolean(trimmedPhone) || Boolean(hasCipc))
      ) {
        const fallbackStart = await startClaimWithoutRpc(supabase, business_id, user.id);
        if (fallbackStart.error) {
          console.error('[Claim API] fallback start claim (no-contact bypass) error:', fallbackStart.error);
          console.log('CLAIM ERROR:', fallbackStart.error);

          if (fallbackStart.error.code === '42501') {
            return errorResponse(
              'RLS_BLOCKED',
              "You don't have permission to create a claim for this account.",
              403,
              {
                db_code: fallbackStart.error.code,
                db_message: fallbackStart.error.message,
              }
            );
          }

          if (fallbackStart.error.code === '23505') {
            return errorResponse(
              'DUPLICATE_CLAIM',
              'You already have a claim in progress for this business.',
              409,
              {
                db_code: fallbackStart.error.code,
                db_message: fallbackStart.error.message,
              }
            );
          }

          return errorResponse(
            'DB_ERROR',
            "We couldn't start your claim right now. Please try again.",
            500,
            {
              db_code: fallbackStart.error.code,
              db_message: fallbackStart.error.message,
            }
          );
        }

        if (fallbackStart.data?.success && fallbackStart.data.claim_id) {
          start = fallbackStart.data;
        } else {
          console.error('[Claim API] fallback start claim (no-contact bypass) failed:', fallbackStart.data);
          console.log('CLAIM ERROR:', fallbackStart.data);
          return errorResponse(
            'DB_ERROR',
            "We couldn't start your claim right now. Please try again.",
            500
          );
        }
      } else {
        const mappedFailure = mapStartClaimFailure(errorMsg);
        if (mappedFailure) {
          return errorResponse(mappedFailure.code, mappedFailure.message, mappedFailure.status);
        }

        console.error('[Claim API] RPC returned failure:', start);
        console.log('CLAIM ERROR:', start);
        return errorResponse(
          'DB_ERROR',
          "We couldn't start your claim right now. Please try again.",
          500
        );
      }
    }

    if (!start.success || !start.claim_id) {
      return errorResponse(
        'DB_ERROR',
        "We couldn't start your claim right now. Please try again.",
        500
      );
    }

    const claimId = start.claim_id;

    // Existing non-draft claims are already in-progress; avoid re-updating rows blocked by RLS.
    if (start.existing && start.status && start.status !== 'draft') {
      const { data: existingClaim } = await supabase
        .from('business_claims')
        .select('status, method_attempted')
        .eq('id', claimId)
        .eq('claimant_user_id', user.id)
        .maybeSingle();

      const existingStatus = (existingClaim?.status as string | undefined) ?? start.status;
      const existingMethodAttempted =
        (existingClaim?.method_attempted as string | null | undefined) ?? start.method_attempted ?? null;

      return NextResponse.json(
        {
          success: true,
          existing: true,
          claim_id: claimId,
          status: existingStatus,
          display_status: toDisplayStatus(existingStatus, existingMethodAttempted),
          method_attempted: existingMethodAttempted,
          next_step: toNextStep(existingStatus, existingMethodAttempted),
          message: 'You already have a claim in progress for this business.',
        },
        { status: 200 },
      );
    }

    // Fetch business contact info for verification detection
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, category, location, website, email, phone')
      .eq('id', business_id)
      .single();

    const verificationData: Record<string, unknown> = {
      role: roleVal,
      email: email || undefined,
      phone: phone || business?.phone || undefined,
      notes: note || undefined,
      cipc_registration_number: cipc_registration_number || undefined,
      cipc_company_name: cipc_company_name || undefined,
    };

    const businessEmail = (email || business?.email || '').toString().trim();
    const businessWebsite = (business?.website || '').toString().trim();

    // Tier 1: Business email domain matches website → auto-verify
    if (businessEmail && businessWebsite && businessEmailDomainMatchesWebsite(businessEmail, businessWebsite)) {
      const { data: completeResult, error: completeError } = await supabase.rpc('complete_claim_verification', {
        p_claim_id: claimId,
        p_method: 'email',
      });

      if (!completeError && (completeResult as any)?.success) {
        const userEmail = user.email || businessEmail;
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userEmail && business) {
          EmailService.sendClaimReceivedEmail({
            recipientEmail: userEmail,
            recipientName: (profile?.display_name || profile?.username) as string | undefined,
            businessName: business.name,
            businessCategory: business.category,
            businessLocation: business.location,
          }).catch((err) => console.error('Claim received email failed:', err));
        }

        return NextResponse.json(
          {
            success: true,
            claim_id: claimId,
            status: 'verified',
            display_status: 'Verified',
            next_step: 'dashboard',
            message: 'Business email verified. You can now manage your listing.',
          },
          { status: 201 }
        );
      }
    }

    // Determine verification method for pending claim
    let methodAttempted: 'email' | 'phone' | 'cipc' | 'documents' = 'documents';
    if (cipc_registration_number && cipc_company_name) {
      methodAttempted = 'cipc';
    } else if (verificationData.phone) {
      methodAttempted = 'phone';
    } else if (verificationData.email) {
      methodAttempted = 'email';
    }

    const submissionStatus =
      methodAttempted === 'cipc'
        ? 'under_review'
        : methodAttempted === 'phone' || methodAttempted === 'email'
          ? 'action_required'
          : 'pending';

    // Update claim: verification_data, status, method_attempted, submitted_at
    const { error: updateError } = await supabase
      .from('business_claims')
      .update({
        verification_data: verificationData,
        status: submissionStatus,
        method_attempted: methodAttempted,
        verification_level: methodAttempted === 'cipc' ? 'level_2' : 'level_1',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .eq('claimant_user_id', user.id);

    if (updateError) {
      console.error('[Claim API] Error updating claim:', updateError);
      return errorResponse(
        'DB_ERROR',
        "We couldn't complete your claim submission. Please try again.",
        500
      );
    }

    const userEmail = user.email || businessEmail;
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userEmail && business) {
      EmailService.sendClaimReceivedEmail({
        recipientEmail: userEmail,
        recipientName: (profile?.display_name || profile?.username) as string | undefined,
        businessName: business.name,
        businessCategory: business.category,
        businessLocation: business.location,
      }).catch((err) => console.error('Claim received email failed:', err));
    }

    const displayStatus = toDisplayStatus(submissionStatus, methodAttempted);
    const nextStep = toNextStep(submissionStatus, methodAttempted);

    return NextResponse.json(
      {
        success: true,
        claim_id: claimId,
        status: submissionStatus,
        display_status: displayStatus,
        method_attempted: methodAttempted,
        next_step: nextStep,
        message:
          submissionStatus === 'under_review'
            ? "Claim submitted. We'll review your CIPC details shortly."
            : submissionStatus === 'action_required'
              ? 'Claim submitted. Complete the requested verification step.'
              : 'Claim submitted successfully.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Claim API] Unexpected error:', error);
    return errorResponse(
      'SERVER_ERROR',
      'Something went wrong on our side. Please try again.',
      500
    );
  }
}

