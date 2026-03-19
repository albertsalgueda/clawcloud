import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/gateway/proxy/:path*',
        destination: '/api/gateway/proxy?path=:path*',
      },
    ]
  },
};

export default nextConfig;
