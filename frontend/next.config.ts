import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Forward with trailing slash directly (avoids 307 redirect cookie loss)
      {
        source: '/api/v1/:path*/',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://financial-advisor-1g9s.onrender.com'}/api/v1/:path*/`,
      },
      // Forward without trailing slash
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://financial-advisor-1g9s.onrender.com'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
