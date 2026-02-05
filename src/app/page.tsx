import type { Metadata } from "next";
import { PageMetadata } from "./lib/utils/seoMetadata";

export const metadata: Metadata = {
  ...PageMetadata.home(),
  alternates: { canonical: "/home" },
  robots: { index: false, follow: true },
};

/**
 * Root page must never redirect. Middleware is the only router for "/".
 * If middleware ever doesn't run (rare), show a safe fallback.
 */
export default function RootPage() {
  return (
    <main style={{ padding: 24 }}>
      <p>Redirecting…</p>
    </main>
  );
}
