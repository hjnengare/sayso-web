import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id || !id.trim()) {
      return NextResponse.json({ error: "Invalid event/special id" }, { status: 400 });
    }

    const supabase = await getServerSupabase(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = (await req.json().catch(() => ({}))) as {
      ctaKind?: string;
      ctaSource?: string | null;
      targetUrl?: string | null;
    };

    const ctaKind = body.ctaKind === "whatsapp" ? "whatsapp" : "external_url";
    const ctaSource = typeof body.ctaSource === "string" ? body.ctaSource : null;
    const targetUrl = typeof body.targetUrl === "string" ? body.targetUrl : null;
    const userAgent = req.headers.get("user-agent");

    const { error } = await supabase.from("event_special_cta_clicks").insert({
      event_special_id: id,
      user_id: user?.id ?? null,
      cta_kind: ctaKind,
      cta_source: ctaSource,
      target_url: targetUrl,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[cta-click] insert failed:", error);
      return NextResponse.json({ error: "Failed to log click" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[cta-click] error:", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
