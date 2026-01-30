import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { isAdmin } from '@/app/lib/admin';
import { EmailService } from '@/app/lib/services/emailService';
import { createClaimNotification, updateClaimLastNotified } from '@/app/lib/claimNotifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'business-verification';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isUserAdmin = await isAdmin(user.id);
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const claimId = (await params).id;
    if (!claimId) {
      return NextResponse.json({ error: 'Claim ID is required' }, { status: 400 });
    }

    const service = getServiceSupabase();

    // New system: business_claims + verify_business_claim RPC
    const { data: claim, error: claimError } = await service
      .from('business_claims')
      .select('id, business_id, claimant_user_id, verification_data')
      .eq('id', claimId)
      .in('status', ['pending', 'under_review', 'action_required'])
      .maybeSingle();

    if (!claimError && claim) {
      const claimRow = claim as {
        business_id: string;
        claimant_user_id: string;
        verification_data: unknown;
      };
      const { data: docs } = await service
        .from('business_claim_documents')
        .select('id, storage_path')
        .eq('claim_id', claimId);
      const docList: { id: string; storage_path: string | null }[] = docs ?? [];
      for (const doc of docList) {
        if (doc.storage_path) {
          await service.storage.from(BUCKET).remove([doc.storage_path]).catch(() => {});
        }
      }
      await service.from('business_claim_documents').delete().eq('claim_id', claimId);

      const { data: rpcResult, error: rpcError } = await (service as any).rpc('verify_business_claim', {
        p_claim_id: claimId,
        p_admin_user_id: user.id,
        p_approved: true,
        p_rejection_reason: null,
        p_admin_notes: null,
      });

      if (rpcError || !(rpcResult as any)?.success) {
        console.error('verify_business_claim RPC error:', rpcError, rpcResult);
        return NextResponse.json(
          { error: 'Failed to approve claim' },
          { status: 500 }
        );
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('id, name, category, location')
        .eq('id', claimRow.business_id)
        .single();

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', claimRow.claimant_user_id)
        .maybeSingle();

      let userEmail: string | undefined;
      try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceRoleKey) {
          const { createClient } = await import('@supabase/supabase-js');
          const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
          );
          const { data: authUser } = await adminClient.auth.admin.getUserById(claimRow.claimant_user_id);
          userEmail = authUser?.user?.email;
        }
      } catch {
        userEmail = (claimRow.verification_data as any)?.email;
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const dashboardUrl = `${baseUrl}/my-businesses/businesses/${claimRow.business_id}`;
      await createClaimNotification({
        userId: claimRow.claimant_user_id,
        claimId,
        type: 'claim_status_changed',
        title: 'Claim approved',
        message: `Your claim for ${business?.name ?? 'your business'} has been approved. You can now manage your listing.`,
        link: `/my-businesses/businesses/${claimRow.business_id}`,
      });
      updateClaimLastNotified(claimId).catch(() => {});

      if (userEmail && business) {
        EmailService.sendClaimApprovedEmail({
          recipientEmail: userEmail,
          recipientName: (profile?.display_name || profile?.username) as string | undefined,
          businessName: business.name,
          businessCategory: business.category,
          businessLocation: business.location,
          dashboardUrl,
        }).catch((err) => console.error('Claim approved email failed:', err));
      }

      return NextResponse.json(
        { success: true, message: 'Claim approved successfully', business_id: claimRow.business_id },
        { status: 200 }
      );
    }

    // Legacy: business_ownership_requests
    const { data: request, error: requestError } = await supabase
      .from('business_ownership_requests')
      .select('*')
      .eq('id', claimId)
      .eq('status', 'pending')
      .maybeSingle();

    if (requestError || !request) {
      return NextResponse.json(
        { error: 'Claim request not found or already processed' },
        { status: 404 }
      );
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, category, location')
      .eq('id', request.business_id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', request.user_id)
      .single();

    let userEmail: string | undefined;
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        const { data: authUser } = await adminClient.auth.admin.getUserById(request.user_id);
        userEmail = authUser?.user?.email;
      }
    } catch {
      userEmail = (request.verification_data as any)?.email;
    }

    const { error: updateError } = await supabase
      .from('business_ownership_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', claimId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to approve claim' }, { status: 500 });
    }

    const role = (request.verification_data as any)?.role || 'owner';
    const { error: ownerError } = await supabase
      .from('business_owners')
      .insert({
        business_id: request.business_id,
        user_id: request.user_id,
        role,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      });

    if (ownerError) {
      console.error('Error creating business owner:', ownerError);
      await supabase
        .from('business_ownership_requests')
        .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
        .eq('id', claimId);
      return NextResponse.json({ error: 'Failed to create business owner record' }, { status: 500 });
    }

    if (userEmail && business) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const dashboardUrl = `${baseUrl}/my-businesses/businesses/${request.business_id}`;
      EmailService.sendClaimApprovedEmail({
        recipientEmail: userEmail,
        recipientName: (profile?.display_name || profile?.username) as string | undefined,
        businessName: business.name,
        businessCategory: business.category,
        businessLocation: business.location,
        dashboardUrl,
      }).catch((err) => console.error('Claim approved email failed:', err));
    }

    return NextResponse.json(
      { success: true, message: 'Claim approved successfully', business_id: request.business_id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in approve claim API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
