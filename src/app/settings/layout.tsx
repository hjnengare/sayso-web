import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | SAYSO",
  description: "Manage your account settings, preferences, and profile information on SAYSO.",
  keywords: ["settings", "account settings", "preferences"],
};

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
