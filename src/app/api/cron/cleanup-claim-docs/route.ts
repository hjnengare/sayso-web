import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'business-verification';

/**
 * GET /api/cron/cleanup-claim-docs
 * Daily cleanup: delete expired business_claim_documents (rows + storage).
 * Call with CRON_SECRET: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const service = getServiceSupabase();

    const { data: expired } = await service
      .from('business_claim_documents')
      .select('id, storage_path')
      .lt('delete_after', new Date().toISOString());

    const docList: { id: string; storage_path: string | null }[] = expired ?? [];
    let deletedCount = 0;
    for (const doc of docList) {
      if (doc.storage_path) {
        await service.storage.from(BUCKET).remove([doc.storage_path]).catch(() => {});
      }
      await service.from('business_claim_documents').delete().eq('id', doc.id);
      deletedCount++;
    }

    const { error: otpError } = await service.rpc('cleanup_expired_business_claim_otp');
    if (otpError) {
      console.warn('cleanup_expired_business_claim_otp:', otpError);
    }

    return NextResponse.json({
      ok: true,
      deleted_documents: deletedCount,
      message: `Cleaned up ${deletedCount} expired claim document(s).`,
    });
  } catch (err) {
    console.error('Cleanup claim docs error:', err);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
