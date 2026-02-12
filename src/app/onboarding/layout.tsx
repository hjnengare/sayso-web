import type { Metadata } from "next";
import { generateSEOMetadata } from "../lib/utils/seoMetadata";

export const metadata: Metadata = generateSEOMetadata({
  title: "Onboarding | Sayso",
  description: "Set up your Sayso preferences.",
  url: "/onboarding",
  noindex: true,
  nofollow: true,
  type: "website",
});

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300..700;1,300..700&family=Livvic:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,900&display=swap" rel="stylesheet" />
      <div className="min-h-screen bg-off-white">
        <main>
          {children}
        </main>
      </div>
    </>
  );
}

