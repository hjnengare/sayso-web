import { NextRequest, NextResponse } from 'next/server';
import { requireAdminContext } from '../seed/_lib';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type GeocodeItemInput = {
  id?: string | null;
  query?: string | null;
  address?: string | null;
  location?: string | null;
};

type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
  query: string;
  provider: 'google' | 'nominatim';
};

type GeocodeResponseItem = {
  index: number;
  id: string | null;
  query: string;
  success: boolean;
  lat: number | null;
  lng: number | null;
  provider: 'google' | 'nominatim' | null;
  error: string | null;
  formatted_address: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAddressInput(input: string): string {
  return input
    .replace(/\r?\n/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/,+/g, ',')
    .replace(/\s*,\s*/g, ', ')
    .replace(/,\s*,+/g, ', ')
    .replace(/^,\s*|\s*,$/g, '')
    .trim();
}

function dedupeAddressSegments(parts: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const part of parts) {
    const cleaned = part.trim();
    if (!cleaned) continue;

    const key = cleaned
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(cleaned);
  }

  return deduped;
}

function ensureCapeTownContext(address: string): string {
  const segments = dedupeAddressSegments(address.split(','));
  const hasCapeTown = segments.some((segment) => /\bcape\s*town\b/i.test(segment));
  const hasSouthAfrica = segments.some((segment) => /\b(south\s*africa|za)\b/i.test(segment));

  if (!hasCapeTown) segments.push('Cape Town');
  if (!hasSouthAfrica) segments.push('South Africa');

  return normalizeAddressInput(segments.join(', '));
}

function expandStreetAbbreviations(address: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/\bRd\.?\b/gi, 'Road'],
    [/\bSt\.?\b/gi, 'Street'],
    [/\bAve\.?\b/gi, 'Avenue'],
    [/\bAv\.?\b/gi, 'Avenue'],
    [/\bBlvd\.?\b/gi, 'Boulevard'],
    [/\bDr\.?\b/gi, 'Drive'],
    [/\bLn\.?\b/gi, 'Lane'],
    [/\bCtr\.?\b/gi, 'Centre'],
  ];

  let normalized = address;
  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalizeAddressInput(normalized);
}

function buildAddressCandidates(rawAddress: string): string[] {
  const base = normalizeAddressInput(rawAddress);
  if (!base) return [];

  const candidates: string[] = [];
  const seen = new Set<string>();

  const pushCandidate = (value: string) => {
    const normalized = normalizeAddressInput(value);
    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    candidates.push(normalized);
  };

  const baseSegments = dedupeAddressSegments(base.split(','));
  const dedupedBase = normalizeAddressInput(baseSegments.join(', '));
  const expandedBase = expandStreetAbbreviations(dedupedBase);

  pushCandidate(dedupedBase);
  pushCandidate(ensureCapeTownContext(dedupedBase));
  pushCandidate(expandedBase);
  pushCandidate(ensureCapeTownContext(expandedBase));

  if (baseSegments.length >= 2) {
    const streetAndArea = `${baseSegments[0]}, ${baseSegments[1]}`;
    pushCandidate(streetAndArea);
    pushCandidate(ensureCapeTownContext(streetAndArea));

    const streetAndLast = `${baseSegments[0]}, ${baseSegments[baseSegments.length - 1]}`;
    pushCandidate(streetAndLast);
    pushCandidate(ensureCapeTownContext(streetAndLast));
  } else {
    pushCandidate(ensureCapeTownContext(baseSegments[0] || dedupedBase));
  }

  return candidates;
}

async function geocodeWithGoogle(candidates: string[], apiKey: string): Promise<GeocodeResult | null> {
  for (const query of candidates) {
    const geocodeUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    geocodeUrl.searchParams.set('address', query);
    geocodeUrl.searchParams.set('region', 'za');
    geocodeUrl.searchParams.set('key', apiKey);

    const response = await fetch(geocodeUrl.toString(), { cache: 'no-store' });
    if (!response.ok) continue;

    const data = await response.json();
    if (data?.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      if (data?.status === 'OVER_QUERY_LIMIT') {
        return null;
      }
      continue;
    }

    const first = data.results[0];
    const lat = first?.geometry?.location?.lat;
    const lng = first?.geometry?.location?.lng;

    if (typeof lat === 'number' && typeof lng === 'number') {
      return {
        lat,
        lng,
        formattedAddress: first.formatted_address || query,
        query,
        provider: 'google',
      };
    }
  }

  return null;
}

async function queryNominatim(query: string, restrictToZA: boolean): Promise<GeocodeResult | null> {
  const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
  nominatimUrl.searchParams.set('format', 'jsonv2');
  nominatimUrl.searchParams.set('q', query);
  nominatimUrl.searchParams.set('limit', '1');
  nominatimUrl.searchParams.set('addressdetails', '1');

  if (restrictToZA) {
    nominatimUrl.searchParams.set('countrycodes', 'za');
  }

  const response = await fetch(nominatimUrl.toString(), {
    headers: {
      'User-Agent': 'sayso-admin-seed/1.0',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const first = data[0] as {
    lat?: string;
    lon?: string;
    display_name?: string;
  };

  const lat = Number.parseFloat(first.lat || '');
  const lng = Number.parseFloat(first.lon || '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    formattedAddress: first.display_name || query,
    query,
    provider: 'nominatim',
  };
}

async function geocodeWithNominatim(candidates: string[]): Promise<GeocodeResult | null> {
  for (const query of candidates) {
    const result = await queryNominatim(query, true);
    if (result) return result;
  }

  for (const query of candidates) {
    const result = await queryNominatim(query, false);
    if (result) return result;
  }

  return null;
}

async function geocodeSingleAddress(rawAddress: string): Promise<GeocodeResult | null> {
  const candidates = buildAddressCandidates(rawAddress).slice(0, 8);
  if (candidates.length === 0) return null;

  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    const googleResult = await geocodeWithGoogle(candidates, googleApiKey);
    if (googleResult) return googleResult;
  }

  return geocodeWithNominatim(candidates);
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminContext(req);
    if (admin.ok === false) {
      return admin.response;
    }

    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? (body.items as GeocodeItemInput[]) : [];
    const updateExisting = body?.updateExisting === true;

    if (items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 });
    }

    if (items.length > 200) {
      return NextResponse.json({ error: 'Too many items (max 200 per request)' }, { status: 400 });
    }

    const results: GeocodeResponseItem[] = [];

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index] || {};
      const query = String(item.address || item.location || item.query || '').trim();

      if (!query) {
        results.push({
          index,
          id: item.id || null,
          query: '',
          success: false,
          lat: null,
          lng: null,
          provider: null,
          error: 'Missing address/location string',
          formatted_address: null,
        });
        continue;
      }

      try {
        const geocode = await geocodeSingleAddress(query);
        if (!geocode) {
          results.push({
            index,
            id: item.id || null,
            query,
            success: false,
            lat: null,
            lng: null,
            provider: null,
            error: 'No geocoding match found',
            formatted_address: null,
          });
        } else {
          results.push({
            index,
            id: item.id || null,
            query,
            success: true,
            lat: geocode.lat,
            lng: geocode.lng,
            provider: geocode.provider,
            error: null,
            formatted_address: geocode.formattedAddress,
          });
        }
      } catch (error: any) {
        results.push({
          index,
          id: item.id || null,
          query,
          success: false,
          lat: null,
          lng: null,
          provider: null,
          error: error?.message || 'Geocode request failed',
          formatted_address: null,
        });
      }

      if (index < items.length - 1) {
        await sleep(250);
      }
    }

    if (updateExisting) {
      const updates = results.filter((item) => item.success && item.id && item.lat !== null && item.lng !== null);
      for (const update of updates) {
        await admin.context.service
          .from('businesses')
          .update({ lat: update.lat, lng: update.lng })
          .eq('id', update.id);
      }
    }

    const successCount = results.filter((item) => item.success).length;
    const failedCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        success: successCount,
        failed: failedCount,
      },
      results,
      updatedExisting: updateExisting,
    });
  } catch (error: any) {
    console.error('[Admin Geocode] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to geocode rows',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
