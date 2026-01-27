import { redirect } from "next/navigation";
import { Metadata } from "next";
import { PageMetadata } from "./lib/utils/seoMetadata";
import { getServerSupabase } from "./lib/supabase/server";

// Set canonical to /home to prevent duplicate content
export const metadata: Metadata = {
  ...PageMetadata.home(),
  alternates: {
    canonical: "/home", // Point canonical to /home since this redirects there
  },
  robots: {
    index: false, // Don't index the redirect page
    follow: true,
  },
};

/**
 * Root page - role-aware redirect
 * - Business owners -> /my-businesses
 * - Unverified users -> /verify-email
 * - Everyone else -> /home
 */
export default async function RootPage() {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && user.email_confirmed_at) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, account_role")
        .eq("user_id", user.id)
        .maybeSingle();

      const resolvedRole = profile?.role || profile?.account_role;
      if (resolvedRole === "business_owner") {
        redirect("/my-businesses");
      }
    }

    if (user && !user.email_confirmed_at) {
      redirect("/verify-email");
    }
  } catch {
    // Fall through to default redirect below.
  }

  redirect("/home");
}
