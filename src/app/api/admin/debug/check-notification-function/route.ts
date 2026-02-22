import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/debug/check-notification-function
 * Checks if the business approval notification function exists in the database
 * Admin only
 */
export const GET = withAdmin(async (
  _req: NextRequest,
  { user, service }
) => {
  // Try to call the function with null values to see if it exists
  const { data: testData, error: testError } = await (service as any)
    .rpc('create_business_approved_notification', {
      p_owner_id: user.id, // Use current user as test
      p_business_id: 'test-business-id',
      p_business_name: 'Test Business'
    });

  if (testError) {
    return NextResponse.json({
      functionExists: testError.code !== '42883', // 42883 = function does not exist
      error: testError.message,
      errorCode: testError.code,
      errorDetails: testError.details,
      errorHint: testError.hint,
      recommendation: testError.code === '42883'
        ? 'The function does not exist. Run the migration: supabase/migrations/20260217_add_badge_and_helpful_notification_types.sql'
        : 'The function exists but there was an error calling it. Check the error details above.'
    });
  }

  return NextResponse.json({
    functionExists: true,
    testNotificationId: testData,
    message: 'Function exists and works correctly'
  });
});
