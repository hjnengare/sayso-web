import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function shouldUseFallbackWithoutJoin(error: unknown): boolean {
  const message = String((error as { message?: string } | null)?.message ?? '').toLowerCase();
  return (
    message.includes('could not find a relationship') ||
    message.includes('relationship') ||
    message.includes('schema cache') ||
    (message.includes('does not exist') && message.includes('businesses'))
  );
}

type BusinessClaimRow = {
  id: string;
  business_id: string;
  claimant_user_id: string;
  status: string;
  method_attempted: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  businesses?:
    | { id: string; name: string; slug: string | null }
    | Array<{ id: string; name: string; slug: string | null }>
    | null;
};

type ClaimsFilter = {
  statuses: string[];
  methods: string[];
  fromDate: string | null;
  toDate: string | null;
};

function parseFilters(req: NextRequest): {
  filters: ClaimsFilter;
  limit: number;
  offset: number;
} {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const method = searchParams.get('method');
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');
  const rawLimit = Number.parseInt(searchParams.get('limit') ?? '50', 10);
  const rawOffset = Number.parseInt(searchParams.get('offset') ?? '0', 10);

  return {
    filters: {
      statuses: status ? status.split(',').map((s) => s.trim()).filter(Boolean) : [],
      methods: method ? method.split(',').map((m) => m.trim()).filter(Boolean) : [],
      fromDate,
      toDate,
    },
    limit: Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50,
    offset: Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0,
  };
}

function applyFilters<T>(query: T, filters: ClaimsFilter): T {
  let next = query as unknown as {
    in: (column: string, values: string[]) => unknown;
    gte: (column: string, value: string) => unknown;
    lte: (column: string, value: string) => unknown;
  };

  if (filters.statuses.length) {
    next = next.in('status', filters.statuses) as typeof next;
  }
  if (filters.methods.length) {
    next = next.in('method_attempted', filters.methods) as typeof next;
  }
  if (filters.fromDate) {
    next = next.gte('created_at', filters.fromDate) as typeof next;
  }
  if (filters.toDate) {
    next = next.lte('created_at', filters.toDate) as typeof next;
  }
  return next as unknown as T;
}

function mapClaims(
  rows: BusinessClaimRow[],
  claimantEmailMap: Map<string, string> = new Map()
): Array<{
  id: string;
  business_id: string;
  business_name: string | null;
  business_slug: string | null;
  claimant_user_id: string;
  claimant_email: string | null;
  status: string;
  method_attempted: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
}> {
  return rows.map((row) => {
    const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
    return {
      id: row.id,
      business_id: row.business_id,
      business_name: business?.name ?? null,
      business_slug: business?.slug ?? null,
      claimant_user_id: row.claimant_user_id,
      claimant_email: claimantEmailMap.get(row.claimant_user_id) ?? null,
      status: row.status,
      method_attempted: row.method_attempted,
      created_at: row.created_at,
      updated_at: row.updated_at,
      submitted_at: row.submitted_at,
      reviewed_at: row.reviewed_at,
    };
  });
}

export const GET = withAdmin(async (req, { service }) => {
  try {
    const { filters, limit, offset } = parseFilters(req);

    let joinedQuery = service
      .from('business_claims')
      .select(
        `
        id,
        business_id,
        claimant_user_id,
        status,
        method_attempted,
        created_at,
        updated_at,
        submitted_at,
        reviewed_at,
        businesses!inner ( id, name, primary_subcategory_slug, primary_subcategory_label, location, slug )
      `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    joinedQuery = applyFilters(joinedQuery, filters);

    const { data: joinedRows, error: joinedError, count: joinedCount } =
      await joinedQuery;

    if (!joinedError) {
      const rows = (joinedRows ?? []) as BusinessClaimRow[];
      const claimantIds = [...new Set(rows.map((r) => r.claimant_user_id).filter(Boolean))];
      let claimantEmailMap = new Map<string, string>();
      if (claimantIds.length > 0) {
        const { data: profiles } = await service
          .from('profiles')
          .select('user_id, email')
          .in('user_id', claimantIds);
        claimantEmailMap = new Map(
          (profiles ?? []).map((p: { user_id: string; email: string | null }) => [p.user_id, p.email ?? '—'])
        );
      }
      const claims = mapClaims(rows, claimantEmailMap);
      return NextResponse.json({
        claims,
        total: joinedCount ?? claims.length,
        limit,
        offset,
      });
    }

    if (!shouldUseFallbackWithoutJoin(joinedError)) {
      console.error('Admin claims list error:', joinedError);
      return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
    }

    console.warn('Admin claims list join fallback activated:', joinedError);

    let fallbackQuery = service
      .from('business_claims')
      .select(
        `
        id,
        business_id,
        claimant_user_id,
        status,
        method_attempted,
        created_at,
        updated_at,
        submitted_at,
        reviewed_at
      `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    fallbackQuery = applyFilters(fallbackQuery, filters);

    const { data: fallbackRows, error: fallbackError, count: fallbackCount } =
      await fallbackQuery;

    if (fallbackError) {
      console.error('Admin claims list fallback error:', fallbackError);
      return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
    }

    const rows = (fallbackRows ?? []) as BusinessClaimRow[];
    const businessIds = Array.from(
      new Set(rows.map((row) => row.business_id).filter(Boolean)),
    );

    let businessMap = new Map<string, { id: string; name: string; slug: string | null }>();
    if (businessIds.length > 0) {
      const { data: businesses, error: businessesError } = await service
        .from('businesses')
        .select('id, name, slug')
        .in('id', businessIds);
      if (businessesError) {
        console.error('Admin claims list fallback businesses error:', businessesError);
      } else {
        const businessRows =
          (businesses ?? []) as Array<{ id: string; name: string; slug?: string | null }>;
        businessMap = new Map(
          businessRows.map((biz) => [
            biz.id as string,
            { id: biz.id as string, name: biz.name as string, slug: (biz.slug as string | null) ?? null },
          ]),
        );
      }
    }

    const enrichedRows = rows.map((row) => ({
      ...row,
      businesses: businessMap.get(row.business_id) ?? null,
    })) as BusinessClaimRow[];

    const claimantIds = [...new Set(rows.map((r) => r.claimant_user_id).filter(Boolean))];
    let claimantEmailMap = new Map<string, string>();
    if (claimantIds.length > 0) {
      const { data: profiles } = await service
        .from('profiles')
        .select('user_id, email')
        .in('user_id', claimantIds);
      claimantEmailMap = new Map(
        (profiles ?? []).map((p: { user_id: string; email: string | null }) => [p.user_id, p.email ?? '—'])
      );
    }
    const claims = mapClaims(enrichedRows, claimantEmailMap);

    return NextResponse.json({
      claims,
      total: fallbackCount ?? claims.length,
      limit,
      offset,
    });
  } catch (err) {
    console.error('Admin claims list error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
});
