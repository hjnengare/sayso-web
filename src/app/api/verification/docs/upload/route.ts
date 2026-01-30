import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { EmailService } from '@/app/lib/services/emailService';
import { createClaimNotification, updateClaimLastNotified } from '@/app/lib/claimNotifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'] as const;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const BUCKET = 'business-verification';
const DOC_TYPES = ['letterhead_authorization', 'lease_first_page'] as const;

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const claimId = formData.get('claimId')?.toString()?.trim() ?? formData.get('claim_id')?.toString()?.trim();
    const docType = formData.get('docType')?.toString()?.trim() ?? formData.get('doc_type')?.toString()?.trim();
    const file = formData.get('file') ?? formData.get('file');

    if (!claimId || !docType) {
      return NextResponse.json({ error: 'claimId and docType are required' }, { status: 400 });
    }
    if (!DOC_TYPES.includes(docType as typeof DOC_TYPES[number])) {
      return NextResponse.json({ error: 'docType must be letterhead_authorization or lease_first_page' }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 });
    }

    const mime = file.type?.toLowerCase();
    if (!mime || !ALLOWED_TYPES.includes(mime as typeof ALLOWED_TYPES[number])) {
      return NextResponse.json({ error: 'Only PDF, JPG and PNG are allowed' }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File must be 5MB or smaller' }, { status: 400 });
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
      return NextResponse.json({ error: 'You can only upload documents for your own claim' }, { status: 403 });
    }
    if (claimRow.status !== 'action_required') {
      return NextResponse.json(
        { error: 'Documents can only be uploaded when we have requested them (action required)' },
        { status: 400 }
      );
    }

    const ext = mime === 'application/pdf' ? 'pdf' : mime === 'image/jpeg' || mime === 'image/jpg' ? 'jpg' : 'png';
    const docId = crypto.randomUUID();
    const storagePath = `claims/${claimId}/${docType}/${docId}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await service.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: mime,
      upsert: false,
    });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    const deleteAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: insertError } = await (service as any).from('business_claim_documents').insert({
      claim_id: claimId,
      storage_path: storagePath,
      doc_type: docType,
      status: 'uploaded',
      delete_after: deleteAfter,
    });

    if (insertError) {
      console.error('Doc insert error:', insertError);
      await service.storage.from(BUCKET).remove([storagePath]).catch(() => {});
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 });
    }

    await (service as any)
      .from('business_claims')
      .update({ status: 'under_review', updated_at: new Date().toISOString() })
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
      type: 'docs_received',
      title: 'Documents received',
      message: `We've received your documents for ${businessDisplayName}. Our team will review them shortly.`,
      link: '/claim-business',
    });
    updateClaimLastNotified(claimId).catch(() => {});

    if (recipientEmail) {
      let businessName: string;
      if (business === null || business === undefined) {
        businessName = 'Your business';
      } else {
        const b = business as { name?: string };
        businessName = b.name ?? 'Your business';
      }
      let recipientName: string | undefined;
      if (profile === null || profile === undefined) {
        recipientName = undefined;
      } else {
        const p = profile as { display_name?: string; username?: string };
        recipientName = p.display_name ?? p.username ?? undefined;
      }
      EmailService.sendDocsReceivedEmail({
        recipientEmail,
        recipientName,
        businessName,
      }).catch((err) => console.error('Docs received email failed:', err));
    }

    return NextResponse.json({
      ok: true,
      message: 'Document uploaded. Your claim is now under review.',
    });
  } catch (err) {
    console.error('Doc upload error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
