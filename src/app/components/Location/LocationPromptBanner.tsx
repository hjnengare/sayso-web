"use client";

interface LocationPromptBannerProps {
  hasCoordinateBusinesses: boolean;
}

// Custom in-app location prompt is intentionally disabled.
// Browser-native permission prompt remains the only permission UI.
export default function LocationPromptBanner(
  _props: LocationPromptBannerProps
) {
  return null;
}

