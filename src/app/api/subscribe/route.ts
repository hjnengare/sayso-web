import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/admin";

function isValidEmail(email: string) {
  const e = email.trim().toLowerCase();
  if (!e) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { email?: string; source?: string }
      | null;

    const email = (body?.email ?? "").trim().toLowerCase();
    const source = (body?.source ?? "unknown").toString().slice(0, 48);

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, message: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const supabase = getServiceSupabase();
    const { error } = await (supabase as any)
      // This table is created via Supabase migrations.
      .from("email_subscribers")
      .insert({ email, source });

    // If it's already subscribed, treat as success.
    if (error && (error as any).code !== "23505") {
      console.error("[subscribe] insert error:", error);
      return NextResponse.json(
        { ok: false, message: "Couldn’t sign you up. Try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[subscribe] error:", err);
    return NextResponse.json(
      { ok: false, message: "Couldn’t sign you up. Try again." },
      { status: 500 },
    );
  }
}
