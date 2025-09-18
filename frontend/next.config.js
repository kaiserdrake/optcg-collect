/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  // Optimize images
  images: {
    domains: [
      // Add any external image domains you use
      'tcg.laeradsphere.com',
      'en.onepiece-cardgame.com',
      'asia-en.onepiece-cardgame.com'
    ],
    // Add these configurations to handle CORB issues
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'en.onepiece-cardgame.com',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'asia-en.onepiece-cardgame.com',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'tcg.laeradsphere.com',
        port: '',
        pathname: '/**',
      }
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

  // Security headers - Updated to fix CORB issues
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
          // Add Cross-Origin headers to prevent CORB
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
      // Specific headers for image requests
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // Add rewrites to proxy external images through your domain
  async rewrites() {
    return [
      {
        source: '/proxy/images/:path*',
        destination: 'https://en.onepiece-cardgame.com/images/:path*',
      },
      {
        source: '/proxy/asia-images/:path*',
        destination: 'https://asia-en.onepiece-cardgame.com/images/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
