import { NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";

const INTERESTS_DATA = [
  { id: 'food-drink', name: 'Food & Drink' },
  { id: 'beauty-wellness', name: 'Beauty & Wellness' },
  { id: 'professional-services', name: 'Professional Services' },
  { id: 'outdoors-adventure', name: 'Outdoors & Adventure' },
  { id: 'experiences-entertainment', name: 'Entertainment & Experiences' },
  { id: 'arts-culture', name: 'Arts & Culture' },
  { id: 'family-pets', name: 'Family & Pets' },
  { id: 'shopping-lifestyle', name: 'Shopping & Lifestyle' }
];

export async function POST() {
  try {
    const supabase = await getServerSupabase();

    const { error } = await supabase
      .from('interests')
      .upsert(INTERESTS_DATA, { onConflict: 'id' });

    if (error) {
      console.error('Error seeding interests:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Interests seeded successfully',
      count: INTERESTS_DATA.length
    });
  } catch (error) {
    console.error('Error in seed interests API:', error);
    return NextResponse.json(
      { error: "Failed to seed interests" },
      { status: 500 }
    );
  }
}
