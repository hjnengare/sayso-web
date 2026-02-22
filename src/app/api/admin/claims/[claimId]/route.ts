import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/app/api/_lib/withAuth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withAdmin(async (
  req: NextRequest,
  { service, params }
) => {
  const resolvedClaimId = (await params)?.claimId;
  if (!resolvedClaimId) {
    return NextResponse.json({ error: 'claimId required' }, { status: 400 });
  }

  const { data: claim, error: claimError } = await service
    .from('business_claims')
    .select(
      `
      id,
      business_id,
      claimant_user_id,
      status,
      method_attempted,
      verification_data,
      rejection_reason,
      admin_notes,
      created_at,
      updated_at,
      submitted_at,
      reviewed_at,
      reviewed_by,
      last_notified_at,
      businesses ( id, name, primary_subcategory_slug, primary_subcategory_label, location, slug, phone, email, website )
    `
    )
    .eq('id', resolvedClaimId)
    .single();

  if (claimError || !claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }
  type ClaimRow = {
    id: string;
    business_id: string;
    claimant_user_id: string;
    status: string;
    method_attempted: string | null;
    verification_data: Record<string, unknown> | null;
    rejection_reason: string | null;
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
    submitted_at: string | null;
    reviewed_at: string | null;
    reviewed_by: string | null;
    last_notified_at: string | null;
    businesses:
      | {
          id: string;
          name: string;
          primary_subcategory_slug: string | null;
          primary_subcategory_label: string | null;
          location: string;
          slug: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
        }
      | {
          id: string;
          name: string;
          primary_subcategory_slug: string | null;
          primary_subcategory_label: string | null;
          location: string;
          slug: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
        }[];
  };
  const claimRow = claim as ClaimRow;

  const { data: events } = await service
    .from('business_claim_events')
    .select('id, event_type, event_data, created_at, created_by')
    .eq('claim_id', resolvedClaimId)
    .order('created_at', { ascending: true });

  const { data: docs } = await service
    .from('business_claim_documents')
    .select('id, doc_type, status, uploaded_at, delete_after')
    .eq('claim_id', resolvedClaimId)
    .order('uploaded_at', { ascending: false });

  let claimantEmail: string | null = null;
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: authUser } = await admin.auth.admin.getUserById(claimRow.claimant_user_id);
    claimantEmail = authUser?.user?.email ?? null;
  } catch {
    claimantEmail = (claimRow.verification_data as Record<string, unknown>)?.email as string ?? null;
  }

  const business = Array.isArray(claimRow.businesses) ? claimRow.businesses[0] : claimRow.businesses;

  return NextResponse.json({
    claim: {
      id: claimRow.id,
      business_id: claimRow.business_id,
      business_name: business?.name ?? null,
      business_slug: business?.slug ?? null,
      business_phone: business?.phone ?? null,
      business_email: business?.email ?? null,
      business_website: business?.website ?? null,
      claimant_user_id: claimRow.claimant_user_id,
      claimant_email: claimantEmail,
      status: claimRow.status,
      method_attempted: claimRow.method_attempted,
      verification_data: claimRow.verification_data,
      rejection_reason: claimRow.rejection_reason,
      admin_notes: claimRow.admin_notes,
      created_at: claimRow.created_at,
      updated_at: claimRow.updated_at,
      submitted_at: claimRow.submitted_at,
      reviewed_at: claimRow.reviewed_at,
      reviewed_by: claimRow.reviewed_by,
      last_notified_at: claimRow.last_notified_at,
    },
    events: events ?? [],
    documents: (docs ?? []).map((d: { id: string; doc_type: string; status: string; uploaded_at: string; delete_after: string }) => ({
      id: d.id,
      doc_type: d.doc_type,
      status: d.status,
      uploaded_at: d.uploaded_at,
      delete_after: d.delete_after,
    })),
  });
});
