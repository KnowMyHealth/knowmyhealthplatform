// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },
  // Allow ngrok URL during development
  allowedDevOrigins: [
    '4914-2409-40c4-e7-94d1-d012-cd4c-76c0-55b0.ngrok-free.app',
  ],
};

export default nextConfig;