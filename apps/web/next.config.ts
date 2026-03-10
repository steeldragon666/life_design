import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@life-design/core', '@life-design/ui', '@life-design/ai'],
  images: {
    remotePatterns: [],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
