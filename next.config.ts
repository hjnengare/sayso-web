import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enhanced Image optimization for maximum performance
  images: {
    // Modern image formats (WebP, AVIF) for smaller file sizes
    formats: ['image/avif', 'image/webp'],
    
    // Device-specific image sizes for optimal loading
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
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
