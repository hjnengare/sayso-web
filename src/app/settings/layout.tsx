import type { Metadata } from "next";
import { ReactNode } from "react";
import { PageMetadata } from '../lib/utils/seoMetadata';
import PortalLayout from "../components/BusinessPortal/PortalLayout";

export const metadata: Metadata = PageMetadata.settings();

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <PortalLayout>{children}</PortalLayout>;
}
