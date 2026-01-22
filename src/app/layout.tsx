import type { Metadata } from "next";
import { generateSEOMetadata } from "./lib/utils/seoMetadata";
import { Urbanist } from "next/font/google";
import dynamicImport from "next/dynamic";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { ToastProvider } from "./contexts/ToastContext";
import { SavedItemsProvider } from "./contexts/SavedItemsContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { MessagesProvider } from "./contexts/MessagesContext";
import PageTransitionProvider from "./components/Providers/PageTransitionProvider";

// Lazy load non-critical components for faster initial load
const WebVitals = dynamicImport(() => import("./components/Performance/WebVitals"));
const BusinessNotifications = dynamicImport(() => import("./components/Notifications/BusinessNotifications"));
const ClientLayoutWrapper = dynamicImport(() => import("./components/Performance/ClientLayoutWrapper"));

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
  variable: "--font-urbanist",
});

export const metadata: Metadata = generateSEOMetadata({
  title: "SAYSO (Home) | Discover trusted local gems near you",
  description: "Find amazing local businesses, restaurants, and experiences in your area with personalized recommendations and trusted reviews.",
  keywords: ["local business", "restaurants", "reviews", "recommendations", "sayso"],
  url: "/",
});

export const runtime = "nodejs";
// Force dynamic rendering at layout level to prevent static generation issues
// Layout is a Server Component, so these exports are valid
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth bg-off-white">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, viewport-fit=cover, user-scalable=no, shrink-to-fit=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="sayso" />
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
        <meta name="mobile-web-app-title" content="sayso" />
        <meta name="application-name" content="sayso" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="full-screen" content="yes" />
        <meta name="browsermode" content="application" />
        <meta name="nightmode" content="enable/disable" />
        <meta name="layoutmode" content="fitscreen/standard" />

        {/* PWA Manifest - Icons defined in manifest.json when available */}

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Preconnect to external domains for faster resource loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/globals.css" as="style" />
        
        {/* Urbanist Font - for body text and card text */}
        <link href="https://fonts.googleapis.com/css2?family=Urbanist:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
        
        {/* Dancing Script Font */}
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap" rel="stylesheet" />
        
        {/* Permanent Marker Font */}
        <link href="https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap" rel="stylesheet" />
        
        {/* Changa One Font */}
        <link href="https://fonts.googleapis.com/css2?family=Changa+One:ital,wght@0,400;1,400&display=swap" rel="stylesheet" />
        
        {/* Cormorant & Livvic Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300..700;1,300..700&family=Livvic:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Momo+Trust+Display&display=swap" rel="stylesheet" />
        
        {/* Playfair Display - Premium font for logo */}
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet" />
 
        {/* Barrio - Font for business card titles */}
        <link href="https://fonts.googleapis.com/css2?family=Barrio&display=swap" rel="stylesheet" />
  
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
        
        {/* Canonical tag removed - set per page via metadata */}
      </head>
      <body className={`${urbanist.className} no-layout-shift scroll-smooth bg-off-white`}>
        <WebVitals />
        <ClientLayoutWrapper />
        <ToastProvider>
          <AuthProvider>
            <OnboardingProvider>
              <SavedItemsProvider>
                <NotificationsProvider>
                  <MessagesProvider>
                    <PageTransitionProvider>
                      <BusinessNotifications />
                      {children}
                    </PageTransitionProvider>
                  </MessagesProvider>
                </NotificationsProvider>
              </SavedItemsProvider>
            </OnboardingProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
