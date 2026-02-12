import type { Metadata } from "next";
import { PageMetadata } from "./lib/utils/seoMetadata";
import HomePage from "./home/page";

export const metadata: Metadata = PageMetadata.home();

/**
 * Root page: renders the Home UI. Proxy redirects / to /home and rewrites /home to / so this page serves both.
 */
export default function RootPage() {
  return <HomePage />;
}
