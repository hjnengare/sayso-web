import { NextRequest, NextResponse } from 'next/server';
import {
  buildBusinessInsertPayload,
  buildInsertSuffix,
  getDatabaseErrorMessage,
  requireAdminContext,
  type ParsedSeedRow,
  type SeedInputRow,
  validateSeedRows,
} from '../_lib';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type InsertMode = 'all' | 'valid_only';

type RejectedRow = {
  rowNumber: number;
  name: string | null;
  reasons: string[];
};

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminContext(req);
    if (admin.ok === false) {
      return admin.response;
    }

    const body = await req.json().catch(() => ({}));
    const rows = Array.isArray(body?.rows) ? (body.rows as SeedInputRow[]) : [];
    const allowDuplicates = body?.allowDuplicates === true;
    const mode: InsertMode = body?.mode === 'valid_only' ? 'valid_only' : 'all';

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
    }

    const validation = await validateSeedRows({
      rows,
      service: admin.context.service,
      allowDuplicates,
    });

    const blockingRows = validation.rows.filter((row) => row.blocking);
    if (mode === 'all' && blockingRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed. Fix blocking rows or use Insert Valid Only.',
          summary: validation.summary,
          rows: validation.rows,
        },
        { status: 422 }
      );
    }

    const insertCandidates = validation.rows.filter((row) => {
      if (!row.parsed) return false;
      if (row.errors.length > 0) return false;
      if (!allowDuplicates && row.duplicate) return false;
      return true;
    });

    const skippedRows: RejectedRow[] = validation.rows
      .filter((row) => !insertCandidates.some((candidate) => candidate.rowNumber === row.rowNumber))
      .map((row) => ({
        rowNumber: row.rowNumber,
        name: row.parsed?.name || null,
        reasons: [...row.errors, ...row.warnings],
      }));

    if (insertCandidates.length === 0) {
      return NextResponse.json({
        success: true,
        mode,
        allowDuplicates,
        summary: {
          totalRows: validation.summary.totalRows,
          insertedCount: 0,
          skippedCount: skippedRows.length,
          skippedDuplicates: skippedRows.filter((row) => row.reasons.some((reason) => reason.startsWith('Duplicate:'))).length,
          rejectedCount: 0,
        },
        insertedIds: [],
        insertedRows: [],
        skippedRows,
        rejectedRows: [],
        validationSummary: validation.summary,
      });
    }

    const suffix = buildInsertSuffix();
    const candidatesWithPayload = insertCandidates.map((candidate) => ({
      rowNumber: candidate.rowNumber,
      parsed: candidate.parsed as ParsedSeedRow,
      payload: buildBusinessInsertPayload(candidate.parsed as ParsedSeedRow, suffix),
    }));

    const insertedRows: Array<{ id: string; rowNumber: number; name: string }> = [];
    const rejectedRows: RejectedRow[] = [];

    const batchSize = 50;
    for (let i = 0; i < candidatesWithPayload.length; i += batchSize) {
      const batch = candidatesWithPayload.slice(i, i + batchSize);

      const { data, error } = await admin.context.service
        .from('businesses')
        .insert(batch.map((item) => item.payload))
        .select('id,name');

      if (!error) {
        const inserted = Array.isArray(data) ? data : [];
        for (let index = 0; index < inserted.length; index += 1) {
          const insertedRow = inserted[index];
          const sourceRow = batch[index];
          if (!sourceRow) continue;
          insertedRows.push({
            id: String(insertedRow.id),
            rowNumber: sourceRow.rowNumber,
            name: sourceRow.parsed.name,
          });
        }
        continue;
      }

      for (const item of batch) {
        const singleInsert = await admin.context.service
          .from('businesses')
          .insert(item.payload)
          .select('id,name')
          .single();

        if (singleInsert.error) {
          rejectedRows.push({
            rowNumber: item.rowNumber,
            name: item.parsed.name,
            reasons: [getDatabaseErrorMessage(singleInsert.error)],
          });
          continue;
        }

        insertedRows.push({
          id: String(singleInsert.data.id),
          rowNumber: item.rowNumber,
          name: item.parsed.name,
        });
      }
    }

    const skippedDuplicates = skippedRows.filter((row) =>
      row.reasons.some((reason) => reason.startsWith('Duplicate:'))
    ).length;

    return NextResponse.json({
      success: true,
      mode,
      allowDuplicates,
      summary: {
        totalRows: validation.summary.totalRows,
        insertedCount: insertedRows.length,
        skippedCount: skippedRows.length,
        skippedDuplicates,
        rejectedCount: rejectedRows.length,
      },
      insertedIds: insertedRows.map((row) => row.id),
      insertedRows,
      skippedRows,
      rejectedRows,
      validationSummary: validation.summary,
    });
  } catch (error: any) {
    console.error('[Admin Seed Insert] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to insert seed rows',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
