import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const phoneOtpMode = (process.env.PHONE_OTP_MODE ?? "").trim().toLowerCase();
if (process.env.NODE_ENV === "production") {
  if (!phoneOtpMode) {
    console.warn('[PHONE OTP] PHONE_OTP_MODE not set during build; defaulting to "twilio".');
  } else if (phoneOtpMode !== "twilio") {
    throw new Error(
      '[PHONE OTP] Production startup blocked: PHONE_OTP_MODE must be set to "twilio".'
    );
  }
}

const nextConfig: NextConfig = {
  // Enhanced Image optimization for maximum performance
  images: {
    // WebP first for fast encoding; AVIF second for clients that support it
    formats: ['image/webp', 'image/avif'],

    // Device-specific image sizes for optimal loading
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Explicit quality values allowed (required in Next.js 16)
    // Include all quality values used in the codebase
    qualities: [20, 25, 50, 60, 70, 75, 80, 85, 90, 100],
    
    // Minimum quality for AVIF (better compression than WebP)
    minimumCacheTTL: 604800, // Cache optimized images for 7 days to reduce repeat transformations
    
    // CDN domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/photo-**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Ticketmaster and external event image CDNs
      {
        protocol: 'https',
        hostname: '**.ticketm.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.ticketmaster.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.tmgrup.com',
        pathname: '/**',
      },
      // Quicket event images
      {
        protocol: 'https',
        hostname: 'images.quicket.co.za',
        pathname: '/**',
      },
      // UI Avatars (fallback avatar generator)
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/api/**',
      },
    ],
    
    // Content Security Policy for images
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Performance optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Compress output
  compress: true,
  
  // Optimize package imports for better tree-shaking
  experimental: {
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      'react-icons',
      'date-fns',
      '@supabase/supabase-js',
    ],
  },
  
  // Webpack configuration for Mapbox GL
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fix for Mapbox GL - resolve fallbacks for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Handle Mapbox GL worker files
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' },
    });
    
    return config;
  },
  
  // Turbopack configuration (for Next.js 16+) - empty config to silence warning
  turbopack: {},
  
  // Headers for security and static asset caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|webp|avif|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
