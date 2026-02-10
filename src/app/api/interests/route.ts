import { NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";

// Fallback interests data - matches the structure expected by OnboardingContext
const FALLBACK_INTERESTS = [
  { id: 'food-drink', name: 'Food & Drink', description: 'Restaurants, cafes, and culinary experiences', icon: 'restaurant' },
  { id: 'beauty-wellness', name: 'Beauty & Wellness', description: 'Gyms, spas, and personal care services', icon: 'cut' },
  { id: 'professional-services', name: 'Professional Services', description: 'Home improvement and professional services', icon: 'home' },
  { id: 'travel', name: 'Travel', description: 'Accommodation, transport, and travel services', icon: 'airplane' },
  { id: 'outdoors-adventure', name: 'Outdoors & Adventure', description: 'Outdoor activities and adventures', icon: 'bicycle' },
  { id: 'experiences-entertainment', name: 'Entertainment & Experiences', description: 'Movies, shows, and nightlife', icon: 'musical-notes' },
  { id: 'arts-culture', name: 'Arts & Culture', description: 'Museums, galleries, and cultural experiences', icon: 'color-palette' },
  { id: 'family-pets', name: 'Family & Pets', description: 'Family activities and pet services', icon: 'heart' },
  { id: 'shopping-lifestyle', name: 'Shopping & Lifestyle', description: 'Retail stores and lifestyle services', icon: 'bag' }
];

/**
 * GET /api/interests
 * Returns the list of available interests
 * Falls back to static data if database query fails
 */
export async function GET() {
  try {
    const supabase = await getServerSupabase();
    
    // Try to fetch from database if interests table exists
    const { data: dbInterests, error } = await supabase
      .from('interests')
      .select('id, name, description, icon')
      .order('name');
    
    // If database query succeeds and returns data, use it
    if (!error && dbInterests && dbInterests.length > 0) {
      const normalizedDbInterests = dbInterests.map(interest => ({
        id: interest.id,
        name: interest.name,
        description: interest.description || undefined,
        icon: interest.icon || undefined,
      }));

      const dbById = new Map(normalizedDbInterests.map((interest) => [interest.id, interest]));
      const fallbackIds = new Set(FALLBACK_INTERESTS.map((interest) => interest.id));

      // Keep stable fallback order while preferring DB values when they exist.
      const mergedInterests = FALLBACK_INTERESTS.map((fallbackInterest) => {
        const fromDb = dbById.get(fallbackInterest.id);
        if (!fromDb) return fallbackInterest;
        return {
          id: fromDb.id || fallbackInterest.id,
          name: fromDb.name || fallbackInterest.name,
          description: fromDb.description || fallbackInterest.description,
          icon: fromDb.icon || fallbackInterest.icon,
        };
      });

      // Preserve any DB-only interests after known fallback interests.
      const extraDbInterests = normalizedDbInterests.filter(
        (interest) => !fallbackIds.has(interest.id)
      );

      return NextResponse.json({ 
        interests: [...mergedInterests, ...extraDbInterests]
      });
    }
    
    // Fallback to static data
    console.log('[Interests API] Using fallback data');
    return NextResponse.json({ interests: FALLBACK_INTERESTS });
    
  } catch (error) {
    console.error('[Interests API] Error:', error);
    // Return fallback data even on error
    return NextResponse.json({ interests: FALLBACK_INTERESTS });
  }
}

