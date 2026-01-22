import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Businesses | SAYSO",
  description: "Manage your business listings, view analytics, and respond to reviews on SAYSO.",
  keywords: ["my businesses", "business management", "business dashboard"],
};

export default function MyBusinessesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
