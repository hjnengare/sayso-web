import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { EmailService } from '@/app/lib/services/emailService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getServerSupabase();
    
    // Check authentication (admin only - you may want to add admin check here)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check here
    // const isAdmin = await checkAdminRole(user.id);
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const claimId = params.id;

    if (!claimId) {
      return NextResponse.json(
        { error: 'Claim ID is required' },
        { status: 400 }
      );
    }

    // Get the ownership request
    const { data: request, error: requestError } = await supabase
      .from('business_ownership_requests')
      .select('*')
      .eq('id', claimId)
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      return NextResponse.json(
        { error: 'Claim request not found or already processed' },
        { status: 404 }
      );
    }

    // Get business details
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, category, location')
      .eq('id', request.business_id)
      .single();

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', request.user_id)
      .single();

    // Get user email from auth.users using service role client
    let userEmail: string | undefined;
    try {
      // Use service role key for admin operations
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );
        const { data: authUser } = await adminClient.auth.admin.getUserById(request.user_id);
        userEmail = authUser?.user?.email;
      } else {
        // Fallback: try to get from profiles or use email from verification_data
        const verificationData = request.verification_data as any;
        userEmail = verificationData?.email;
      }
    } catch (error) {
      console.warn('Could not fetch user email, using fallback:', error);
      const verificationData = request.verification_data as any;
      userEmail = verificationData?.email;
    }

    // Update claim status to approved
    const { error: updateError } = await supabase
      .from('business_ownership_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', claimId);

    if (updateError) {
      console.error('Error updating ownership request:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve claim' },
        { status: 500 }
      );
    }

    // Extract role from verification_data
    const role = (request.verification_data as any)?.role || 'owner';

    // Insert into business_owners
    const { error: ownerError } = await supabase
      .from('business_owners')
      .insert({
        business_id: request.business_id,
        user_id: request.user_id,
        role: role,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      });

    if (ownerError) {
      console.error('Error creating business owner:', ownerError);
      // Try to rollback the status update
      await supabase
        .from('business_ownership_requests')
        .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
        .eq('id', claimId);
      
      return NextResponse.json(
        { error: 'Failed to create business owner record' },
        { status: 500 }
      );
    }

    // Send approval email (non-blocking)
    if (userEmail && business) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const dashboardUrl = `${baseUrl}/my-businesses/businesses/${request.business_id}`;

      EmailService.sendClaimApprovedEmail({
        recipientEmail: userEmail,
        recipientName: profile?.display_name || profile?.username || undefined,
        businessName: business.name,
        businessCategory: business.category,
        businessLocation: business.location,
        dashboardUrl,
      }).catch((error) => {
        // Log but don't fail the request if email fails
        console.error('Failed to send claim approved email:', error);
      });
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Claim approved successfully',
        business_id: request.business_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in approve claim API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

