import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/app/api/_lib/withAuth';
import {
  type SeedInputRow,
  validateSeedRows,
} from '../_lib';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withAdmin(async (req: NextRequest, { service }) => {
  try {
    const body = await req.json().catch(() => ({}));
    const rows = Array.isArray(body?.rows) ? (body.rows as SeedInputRow[]) : [];
    const allowDuplicates = body?.allowDuplicates === true;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
    }

    const result = await validateSeedRows({
      rows,
      service,
      allowDuplicates,
    });

    return NextResponse.json({
      success: true,
      allowDuplicates,
      summary: result.summary,
      rows: result.rows,
    });
  } catch (error: any) {
    console.error('[Admin Seed Validate] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to validate seed rows',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
});
