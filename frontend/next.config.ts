import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },

  allowedDevOrigins: [
    '4914-2409-40c4-e7-94d1-d012-cd4c-76c0-55b0.ngrok-free.app',
    'detection-fragility-canteen.ngrok-free.dev',
  ],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  async redirects() {
    return [
      // Catch common brand misspellings / no-www
      {
        source: '/',
        has: [{ type: 'host', value: 'www.knowmyhealth.in' }],
        destination: 'https://knowmyhealth.in/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
