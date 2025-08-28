/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  // Disable ESLint during builds to focus on functionality
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Optimize images
  images: {
    domains: [
      // Add any external image domains you use
      'tcg.laeradsphere.com',
      'en.onepiece-cardgame.com',
      'asia-en.onepiece-cardgame.com'
    ],
  },

  // Environment variables that should be available at runtime
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Experimental features for better Suspense handling
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
