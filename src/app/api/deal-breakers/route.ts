import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Deal-breakers are public reference data — use service role to bypass RLS
    // so anonymous/guest users can also fetch quick tags.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase
      .from('deal_breakers')
      .select('id, label, icon, category_id')
      .order('label');

    if (error) {
      console.error('Error fetching deal-breakers:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      dealBreakers: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error in GET deal-breakers API:', error);
    return NextResponse.json(
      { error: "Failed to fetch deal-breakers" },
      { status: 500 }
    );
  }
}
