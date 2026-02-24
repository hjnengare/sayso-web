import type { Metadata } from "next";
import { ReactNode } from "react";
import { PageMetadata } from '../../lib/utils/seoMetadata';

export const metadata: Metadata = PageMetadata.settings();

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
