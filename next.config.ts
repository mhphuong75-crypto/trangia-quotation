import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force dynamic - no static cache
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;
