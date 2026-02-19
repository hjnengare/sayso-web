import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/reverse-geocode
 * Reverse geocode coordinates to get address
 * Query params: lat (required), lng (required)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');

    if (!latParam || !lngParam) {
      return NextResponse.json(
        { error: 'lat and lng are required' },
        { status: 400 }
      );
    }

    const lat = Number.parseFloat(latParam);
    const lng = Number.parseFloat(lngParam);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: 'Invalid lat or lng' },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of range' },
        { status: 400 }
      );
    }

    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '18');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'sayso-app/1.0',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Reverse geocode request failed' },
        { status: 502 }
      );
    }

    const data = await response.json();

    const displayName = data?.display_name ?? '';
    const address = data?.address ?? {};
    const city =
      address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? '';
    const country = address.country ?? '';
    const location = city && country ? `${city}, ${country}` : displayName || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    return NextResponse.json({
      success: true,
      address: displayName,
      location: location.trim() || displayName,
      lat,
      lng,
    });
  } catch (error: unknown) {
    console.error('Reverse geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to reverse geocode', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
