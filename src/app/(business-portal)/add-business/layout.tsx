import type { Metadata } from "next";
import { PageMetadata } from "../../lib/utils/seoMetadata";
import { ReactNode } from "react";

export const metadata: Metadata = PageMetadata.addBusiness();

export default function AddBusinessLayout({ children }: { children: ReactNode }) {
  return children;
}
