import { redirect } from "next/navigation";
import { Metadata } from "next";
import { PageMetadata } from "./lib/utils/seoMetadata";

// Set canonical to /home to prevent duplicate content
export const metadata: Metadata = {
  ...PageMetadata.home(),
  alternates: {
    canonical: "/home", // Point canonical to /home since middleware redirects / there
  },
  robots: {
    index: false, // Don't index the router URL
    follow: true,
  },
};

/**
 * Root page — router URL only.
 * Middleware is the single decision point for / (guest → /home, personal → /home, business → /my-businesses).
 * This page should not run in normal flow; fallback redirect only if middleware did not run.
 */
export default function RootPage() {
  redirect("/home");
}
