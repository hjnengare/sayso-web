import { Metadata } from "next";

interface MetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
}

export function generateMetadata({
  title = "Sayso | Hyper-local reviews & discovery for Cape Town",
  description = "Sayso is a hyper-local reviews and discovery app for Cape Town.",
  keywords = ["sayso", "cape town reviews", "hyper-local discovery"],
  ogImage = "https://sayso.co.za/opengraph-image",
  canonical,
}: MetaTagsProps = {}): Metadata {
  // Ensure keywords is always an array
  const keywordsArray = Array.isArray(keywords) ? keywords : [];
  
  return {
    title,
    description,
    keywords: keywordsArray.join(", "),
    authors: [{ name: "sayso Team" }],
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      type: "website",
      siteName: "sayso",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    ...(canonical && { alternates: { canonical } }),
  };
}
