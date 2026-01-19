import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/geocode/reverse
 * Reverse geocode coordinates to get a street address
 * Body: { latitude: number, longitude: number }
 */
export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Try Google Maps Geocoding API first (if API key exists)
    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
        
        const response = await fetch(googleUrl);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          // Extract street address from the results
          const streetAddress = data.results
            .find((result: any) => result.types.includes('street_address'))?.formatted_address 
            || data.results
            .find((result: any) => result.types.includes('route'))?.formatted_address
            || data.results[0]?.formatted_address;

          if (streetAddress) {
            return NextResponse.json({
              success: true,
              address: streetAddress,
              formatted_address: streetAddress,
              source: 'google'
            });
          }
        }
      } catch (error) {
        console.error('[Reverse Geocode] Google Maps error:', error);
        // Fall through to Nominatim
      }
    }

    // Fallback: Use OpenStreetMap Nominatim (free, no API key required)
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'sayso-app/1.0', // Required by Nominatim
        },
      });

      const data = await response.json();

      if (data.address) {
        // Build street address from components
        const street = data.address.road || data.address.pedestrian || '';
        const number = data.address.house_number || '';
        const suburb = data.address.suburb || data.address.neighbourhood || '';
        const city = data.address.city || data.address.town || '';
        
        // Format address: "123 Main Street, Suburb, City"
        const parts = [
          number && street ? `${number} ${street}` : street,
          suburb,
          city
        ].filter(Boolean);
        
        const streetAddress = parts.join(', ') || data.address.name || data.display_name;

        return NextResponse.json({
          success: true,
          address: streetAddress,
          formatted_address: data.display_name,
          source: 'nominatim'
        });
      } else {
        return NextResponse.json(
          { error: 'No address found for these coordinates', details: data },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error('[Reverse Geocode] Nominatim error:', error);
      throw error;
    }
  } catch (error) {
    console.error('[Reverse Geocode] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reverse geocode coordinates' },
      { status: 500 }
    );
  }
}
