// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
<<<<<<< HEAD
  allowedDevOrigins: ['172.17.224.1'],
=======
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
>>>>>>> 4dc24197f94f16a48345992eeb5dba37b5616d1d
};

export default nextConfig;