// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcrypt']
  },
  webpack: (config) => {
    // Add support for native node modules
    config.externals = [...(config.externals || []), 'bcrypt'];
    
    // Important: return the modified config
    return config;
  },
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'gdseeanbqtomckzaegjl.supabase.co'
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Disable React Strict Mode for compatibility with React 19
  reactStrictMode: false,
  // Increase timeout for build process
  staticPageGenerationTimeout: 180,
  // Enable SWC minification
  swcMinify: true,
  // Add compiler options to help with hydration issues
  compiler: {
    styledComponents: true,
  }
};

export default nextConfig;