import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize performance
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'qrcode'],
  },
  // Compress output
  compress: true,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
