/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  // Optimize images
  images: {
    domains: [
      // Add any external image domains you use
      '1pc.laeradsphere.com',
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
        hostname: '1pc.laeradsphere.com',
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

  async rewrites() {
    // Rewrites run server-side, so we must use the internal Docker network
    // hostname, not the public-facing NEXT_PUBLIC_API_URL (which is localhost:3001
    // from the host machine's perspective and unreachable inside the container).
    const internalApiUrl = 'http://opcc-backend:3001';
    return [
      {
        source: '/card-images/:path*',
        destination: `${internalApiUrl}/card-images/:path*`,
      },
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
