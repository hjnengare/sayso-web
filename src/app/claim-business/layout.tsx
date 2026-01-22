import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Claim Business | SAYSO",
  description: "Claim your business listing on SAYSO and start managing your business profile today.",
  keywords: ["claim business", "business verification", "business listing"],
};

export default function ClaimBusinessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
