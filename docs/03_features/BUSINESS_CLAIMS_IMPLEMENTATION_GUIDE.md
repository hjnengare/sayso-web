# Business Claims System - Complete Implementation Guide

## Overview

This guide provides a step-by-step implementation of a robust 3-level business verification system with proper security, audit trails, and admin controls.

---

## ✅ Step 1: Database Schema (COMPLETED)

The migration `20260112_create_business_claims_system.sql` has been created with:

- **business_claims** table - Tracks all claim attempts
- **business_claim_events** table - Audit trail
- **claim_verification_otps** table - OTP storage
- **claim_documents** table - Document uploads (Level 3)
- **businesses** table - Added ownership fields
- RPC functions for claim workflow
- Row-level security policies

---

## Step 2: API Routes

### 2.1 Start Claim API

**Path**: `/api/business/claim/start`

```typescript
// src/app/api/business/claim/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { business_id } = await req.json();

  // Call RPC function with pre-checks
  const { data, error } = await supabase.rpc('start_business_claim', {
    p_business_id: business_id,
    p_claimant_user_id: user.id
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data.success) {
    return NextResponse.json(
      { error: data.error, dispute: data.dispute || false },
      { status: 400 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
```

### 2.2 Level 1 - Email Verification API

**Path**: `/api/business/claim/verify/email`

```typescript
// src/app/api/business/claim/verify/email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import bcrypt from 'bcrypt';

// Block personal email domains
const BLOCKED_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { claim_id, email } = await req.json();

  // Get claim
  const { data: claim } = await supabase
    .from('business_claims')
    .select('*, businesses(website)')
    .eq('id', claim_id)
    .eq('claimant_user_id', user.id)
    .single();

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  // Extract domain from business website
  const businessDomain = claim.businesses?.website
    ? new URL(claim.businesses.website).hostname.replace('www.', '')
    : null;

  if (!businessDomain) {
    return NextResponse.json(
      { error: 'Business has no website. Try phone verification.' },
      { status: 400 }
    );
  }

  // Extract email domain
  const emailDomain = email.split('@')[1]?.toLowerCase();

  // Block personal emails
  if (BLOCKED_DOMAINS.includes(emailDomain)) {
    return NextResponse.json(
      { error: 'Personal emails cannot be used for verification. Use business email.' },
      { status: 400 }
    );
  }

  // Check domain match
  if (emailDomain !== businessDomain) {
    return NextResponse.json(
      {
        error: `Email domain (${emailDomain}) doesn't match business website (${businessDomain})`,
        can_retry: true
      },
      { status: 400 }
    );
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 10);

  // Store OTP (expires in 10 minutes)
  await supabase.from('claim_verification_otps').insert({
    claim_id,
    otp_type: 'email',
    otp_hash: otpHash,
    target_contact: email,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  });

  // TODO: Send OTP via email service
  console.log(`[DEV] OTP for ${email}: ${otp}`);

  // Log event
  await supabase.from('business_claim_events').insert({
    claim_id,
    event_type: 'email_sent',
    event_data: { email },
    created_by: user.id
  });

  return NextResponse.json({
    success: true,
    message: `OTP sent to ${email}`
  });
}
```

### 2.3 Verify OTP API

**Path**: `/api/business/claim/verify/otp`

```typescript
// src/app/api/business/claim/verify/otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { claim_id, otp, otp_type } = await req.json();

  // Get latest OTP
  const { data: otpRecord } = await supabase
    .from('claim_verification_otps')
    .select('*')
    .eq('claim_id', claim_id)
    .eq('otp_type', otp_type)
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!otpRecord) {
    return NextResponse.json({ error: 'OTP not found or expired' }, { status: 404 });
  }

  // Check expiry
  if (new Date(otpRecord.expires_at) < new Date()) {
    return NextResponse.json({ error: 'OTP expired' }, { status: 400 });
  }

  // Check attempts
  if (otpRecord.attempts >= otpRecord.max_attempts) {
    return NextResponse.json({ error: 'Maximum attempts exceeded' }, { status: 429 });
  }

  // Verify OTP
  const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);

  if (!isValid) {
    // Increment attempts
    await supabase
      .from('claim_verification_otps')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id);

    return NextResponse.json(
      {
        error: 'Invalid OTP',
        attempts_remaining: otpRecord.max_attempts - otpRecord.attempts - 1
      },
      { status: 400 }
    );
  }

  // Mark OTP as verified
  await supabase
    .from('claim_verification_otps')
    .update({ verified: true })
    .eq('id', otpRecord.id);

  // Update claim status to verified
  await supabase
    .from('business_claims')
    .update({
      status: 'verified',
      verification_level: 'level_1',
      method_attempted: otp_type,
      updated_at: new Date().toISOString()
    })
    .eq('id', claim_id);

  // Update business ownership
  const { data: claim } = await supabase
    .from('business_claims')
    .select('business_id, claimant_user_id')
    .eq('id', claim_id)
    .single();

  await supabase
    .from('businesses')
    .update({
      owner_id: claim.claimant_user_id,
      owner_verified: true,
      owner_verification_method: otp_type,
      owner_verified_at: new Date().toISOString()
    })
    .eq('id', claim.business_id);

  // Log event
  await supabase.from('business_claim_events').insert({
    claim_id,
    event_type: otp_type === 'email' ? 'email_verified' : 'phone_verified',
    event_data: { method: otp_type },
    created_by: user.id
  });

  return NextResponse.json({
    success: true,
    status: 'verified',
    message: 'Business claim verified successfully!'
  });
}
```

### 2.4 Level 2 - CIPC Verification API

**Path**: `/api/business/claim/verify/cipc`

```typescript
// src/app/api/business/claim/verify/cipc/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { claim_id, registration_number, company_name } = await req.json();

  if (!registration_number || !company_name) {
    return NextResponse.json(
      { error: 'Registration number and company name are required' },
      { status: 400 }
    );
  }

  // Update claim with CIPC details
  await supabase
    .from('business_claims')
    .update({
      status: 'pending',
      verification_level: 'level_2',
      method_attempted: 'cipc',
      verification_data: {
        cipc_registration_number: registration_number,
        cipc_company_name: company_name,
        submitted_at: new Date().toISOString()
      },
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', claim_id)
    .eq('claimant_user_id', user.id);

  // Log event
  await supabase.from('business_claim_events').insert({
    claim_id,
    event_type: 'level_upgraded',
    event_data: {
      level: 'level_2',
      method: 'cipc',
      registration_number
    },
    created_by: user.id
  });

  return NextResponse.json({
    success: true,
    status: 'pending',
    message: 'CIPC verification submitted. Admin will review shortly.'
  });
}
```

### 2.5 Admin Queue API

**Path**: `/api/admin/claims/queue`

```typescript
// src/app/api/admin/claims/queue/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Check admin role

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending';

  const { data: claims, error } = await supabase
    .from('business_claims')
    .select(`
      *,
      businesses(id, name, category, location),
      profiles!business_claims_claimant_user_id_fkey(display_name, username)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ claims });
}
```

### 2.6 Admin Approve/Reject API

**Path**: `/api/admin/claims/[id]/review`

```typescript
// src/app/api/admin/claims/[id]/review/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { approved, rejection_reason, admin_notes } = await req.json();

  // Call RPC function
  const { data, error } = await supabase.rpc('verify_business_claim', {
    p_claim_id: params.id,
    p_admin_user_id: user.id,
    p_approved: approved,
    p_rejection_reason: rejection_reason,
    p_admin_notes: admin_notes
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

---

## Step 3: Frontend Components

### 3.1 Claim Wizard Component

Create a 3-stage wizard that guides users through the claim process.

**File**: `src/app/components/BusinessClaim/ClaimWizard.tsx`

Key features:
- Stage A: Confirm authorization
- Stage B: Choose verification method (email/phone/CIPC)
- Stage C: Enter verification details and track status

### 3.2 Verification Method Selector

Show only available methods based on business data:
- Email verification (if business has website with valid domain)
- Phone OTP (if business has phone number)
- CIPC (if Level 1 failed)
- Documents (only as last resort)

### 3.3 Admin Dashboard

Create admin interface at `/admin/claims` with:
- Queue of pending claims
- Filter by status
- Review interface with approve/reject buttons
- View CIPC details and documents

---

## Step 4: Rate Limiting & Security

### 4.1 Rate Limiting Middleware

```typescript
// src/app/lib/rateLimiting/claimRateLimiter.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export async function checkClaimRateLimit(userId: string, action: string): Promise<boolean> {
  const key = `claim:${action}:${userId}`;
  const count = await redis.incr(key);

  if (count === 1) {
    // Set expiry on first increment
    await redis.expire(key, 3600); // 1 hour
  }

  const maxAttempts = {
    'otp_send': 3,
    'otp_verify': 5,
    'claim_create': 5
  }[action] || 10;

  return count <= maxAttempts;
}
```

### 4.2 Document Upload Security

- Max file size: 5MB
- Allowed types: PDF, JPG, PNG
- Virus scanning (ClamAV or similar)
- Private storage bucket (not public)
- Auto-delete after 30 days

---

## Step 5: Email Service Integration

```typescript
// src/app/lib/services/emailService.ts
export class EmailService {
  static async sendVerificationOTP(email: string, otp: string, businessName: string) {
    // Use Resend, SendGrid, or similar
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'verify@sayso.co.za',
        to: email,
        subject: `Verify your claim for ${businessName}`,
        html: `
          <h2>Verify Your Business Claim</h2>
          <p>Your verification code is: <strong>${otp}</strong></p>
          <p>This code expires in 10 minutes.</p>
        `
      })
    });
  }
}
```

---

## Step 6: SMS/WhatsApp Integration (Phone OTP)

```typescript
// src/app/lib/services/smsService.ts
import { Twilio } from 'twilio';

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export class SMSService {
  static async sendOTP(phone: string, otp: string, businessName: string) {
    await client.messages.create({
      body: `Your Sayso verification code for ${businessName}: ${otp}. Expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
  }
}
```

---

## Step 7: Testing Checklist

### Unit Tests
- [ ] RPC functions (start_business_claim, verify_business_claim)
- [ ] OTP generation and verification
- [ ] Rate limiting logic
- [ ] Email/phone validation

### Integration Tests
- [ ] Full claim flow (Level 1 email)
- [ ] Full claim flow (Level 1 phone)
- [ ] Full claim flow (Level 2 CIPC)
- [ ] Admin approval flow
- [ ] Rate limit enforcement
- [ ] Dispute handling

### Security Tests
- [ ] RLS policies prevent unauthorized access
- [ ] OTP cannot be brute forced
- [ ] Documents are not publicly accessible
- [ ] XSS/SQL injection prevention

---

## Step 8: Monitoring & Observability

### Metrics to Track
- Claim conversion rate (draft → verified)
- Average time to verification
- Failure rates by method
- Admin queue length
- Dispute rate

### Logging Events
All events are logged in `business_claim_events`:
- claim_started
- email_sent / phone_sent
- otp_verified
- level_upgraded
- verification_success
- verification_rejected

---

## Step 9: Deployment Checklist

- [ ] Run migration: `20260112_create_business_claims_system.sql`
- [ ] Set up environment variables (RESEND_API_KEY, TWILIO_*, etc.)
- [ ] Configure rate limiting (Upstash Redis)
- [ ] Set up document storage bucket (private)
- [ ] Configure auto-cleanup cron jobs
- [ ] Add admin role checks
- [ ] Enable audit logging

---

## Step 10: Future Enhancements

1. **Automated CIPC Verification**: Integrate with CIPC API for instant verification
2. **Video Verification**: For high-value/disputed claims
3. **ID Document OCR**: For manager verification
4. **Ownership Transfer Flow**: Allow verified owners to transfer to new owners
5. **Bulk Claims**: For franchise/chain managers

---

## Support & Documentation

For questions or issues:
- GitHub Issues: [Link to repo issues]
- Documentation: [Link to full docs]
- Admin Guide: [Internal admin SOP]
