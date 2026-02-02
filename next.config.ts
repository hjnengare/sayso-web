import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Enhanced Image optimization for maximum performance
  images: {
    // Modern image formats (WebP, AVIF) for smaller file sizes
    formats: ['image/avif', 'image/webp'],
    
    // Device-specific image sizes for optimal loading
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Explicit quality values allowed (required in Next.js 16)
    // Include all quality values used in the codebase: 85, 90, 100
    qualities: [25, 50, 75, 85, 90, 100],
    
    // Minimum quality for AVIF (better compression than WebP)
    minimumCacheTTL: 60, // Cache optimized images for 60 seconds minimum
    
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
  
  // Headers for static asset caching
  async headers() {
    return [
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
