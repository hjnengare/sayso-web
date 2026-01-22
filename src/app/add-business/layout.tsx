import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Business | SAYSO",
  description: "Create a new business listing on SAYSO and start reaching customers in your area.",
  keywords: ["add business", "create listing", "business registration"],
};

export default function AddBusinessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
