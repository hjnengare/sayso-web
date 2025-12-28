import type { NextConfig } from "next";

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
    ],
    
    // Allow unoptimized images only in development
    unoptimized: process.env.NODE_ENV === 'development',
    
    // Content Security Policy for images
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Performance optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Compress output
  compress: true,
  
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

export default nextConfig;
