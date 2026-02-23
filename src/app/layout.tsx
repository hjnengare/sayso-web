import type { Metadata } from "next";
import { BRAND_POSITIONING, DEFAULT_SITE_DESCRIPTION, generateSEOMetadata, SITE_NAME } from "./lib/utils/seoMetadata";
import { 
  Urbanist, 
  Dancing_Script, 
  Permanent_Marker, 
  Changa_One, 
  Cormorant, 
  Livvic, 
  Playfair_Display, 
  Barrio 
} from "next/font/google";
import localFont from "next/font/local";
import dynamicImport from "next/dynamic";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { ToastProvider } from "./contexts/ToastContext";
import { SavedItemsProvider } from "./contexts/SavedItemsContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import NotificationToasts from "./components/Notifications/NotificationToasts";
import DeferredProviders from "./components/Providers/DeferredProviders";
import { LazyMotionProvider } from "./lib/lazy-motion-provider";
import { RealtimeProvider } from "./contexts/RealtimeContext";
import GlobalHeader from "./components/Header/GlobalHeader";
import SchemaMarkup from "./components/SEO/SchemaMarkup";
import { generateOrganizationSchema, generateWebSiteSchema, generateSiteNavigationSchema } from "./lib/utils/schemaMarkup";
import ScrollToTopButton from "./components/Navigation/ScrollToTopButton";
import SWRProvider from "./components/Providers/SWRProvider";

// Lazy load non-critical components for faster initial load
const WebVitals = dynamicImport(() => import("./components/Performance/WebVitals"));
const ClientLayoutWrapper = dynamicImport(() => import("./components/Performance/ClientLayoutWrapper"));

// Primary font - Urbanist (preloaded, critical)
const urbanist = Urbanist({
  subsets: ["latin"],
  // Only include weights that are actually used across the app.
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
  variable: "--font-urbanist",
});

// Wordmark font - MonarchParadox (preloaded, critical for header logo)
const monarchParadox = localFont({
  src: [
    {
      path: "../../public/fonts/monarchparadox.otf",
      weight: "400",
      style: "normal",
    },
  ],
  preload: true,
  display: "swap",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
  variable: "--font-monarch-paradox",
});

// Display fonts - loaded with swap for non-blocking render
const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
  display: "swap",
  variable: "--font-dancing-script",
});

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  preload: false,
  display: "swap",
  variable: "--font-permanent-marker",
});

const changaOne = Changa_One({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  preload: false,
  display: "swap",
  variable: "--font-changa-one",
});

const cormorant = Cormorant({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  preload: false,
  display: "swap",
  variable: "--font-cormorant",
});

const livvic = Livvic({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
  preload: false,
  display: "swap",
  variable: "--font-livvic",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  preload: false,
  display: "swap",
  variable: "--font-playfair-display",
});

const barrio = Barrio({
  subsets: ["latin"],
  weight: "400",
  preload: false,
  display: "swap",
  variable: "--font-barrio",
});

export const metadata: Metadata = {
  ...generateSEOMetadata({
    title: `${SITE_NAME} | ${BRAND_POSITIONING}`,
    description: DEFAULT_SITE_DESCRIPTION,
    keywords: ["sayso", "sayso reviews", "cape town business reviews", "cape town events", "hyper-local discovery"],
    url: "/",
  }),
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  verification: {
    google: "01a88f23a79c8d23",
  },
};

export const runtime = "nodejs";
// Force dynamic rendering at layout level to avoid static prerender conflicts in client-search pages.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <html
      lang="en"
      className={`${urbanist.variable} ${monarchParadox.variable} ${dancingScript.variable} ${permanentMarker.variable} ${changaOne.variable} ${cormorant.variable} ${livvic.variable} ${playfairDisplay.variable} ${barrio.variable} scroll-smooth bg-off-white`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, viewport-fit=cover, user-scalable=no, shrink-to-fit=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sayso" />
        {/* Theme color - matches navbar background for browser UI */}
        {/* Locked to light mode: brand controls color, not OS */}
        <meta name="theme-color" content="#722F37" />
        <meta name="theme-color" content="#722F37" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#722F37" media="(prefers-color-scheme: dark)" />
        <meta name="msapplication-TileColor" content="#722F37" />
        {/* Color scheme - LOCKED TO LIGHT: prevents OS dark mode heuristics */}
        <meta name="color-scheme" content="light" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="apple-mobile-web-app-orientation" content="portrait" />

        {/* Enhanced mobile experience meta tags */}
        <meta name="mobile-web-app-title" content="Sayso" />
        <meta name="application-name" content="Sayso" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="full-screen" content="yes" />
        <meta name="browsermode" content="application" />
        <meta name="nightmode" content="enable/disable" />
        <meta name="layoutmode" content="fitscreen/standard" />

        {/* PWA install prompt disabled: no manifest link */}
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />

        {/* Preconnect to external domains for faster resource loading */}
        {supabaseUrl ? (
          <>
            <link rel="dns-prefetch" href={supabaseUrl} />
            <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />
          </>
        ) : null}
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        
        {/* Canonical tag removed - set per page via metadata */}
      </head>
      <body className="no-layout-shift scroll-smooth bg-off-white">
        <SchemaMarkup schemas={[
          generateOrganizationSchema(),
          generateWebSiteSchema(),
          generateSiteNavigationSchema(),
        ]} />
        <WebVitals />
        <ClientLayoutWrapper />
        {/* Service Worker Registration - deferred to not block initial render */}
        <Script
          id="sw-registration"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(function () {});
              }
            `,
          }}
        />
        <SWRProvider>
        <ToastProvider>
          <AuthProvider>
            <OnboardingProvider>
              <SavedItemsProvider>
                <NotificationsProvider>
                  <NotificationToasts />
                  <LazyMotionProvider>
                    <GlobalHeader />
                    <RealtimeProvider>
                      <DeferredProviders>
                        {children}
                      </DeferredProviders>
                    </RealtimeProvider>
                    <ScrollToTopButton threshold={360} desktopThreshold={100} />
                  </LazyMotionProvider>
                </NotificationsProvider>
              </SavedItemsProvider>
            </OnboardingProvider>
          </AuthProvider>
        </ToastProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
