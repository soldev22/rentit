import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    // Allow images from your Azure blob container used in tests and uploads
    domains: ['rentit2.blob.core.windows.net'],
    // Also accept any blob.core.windows.net subdomain as a fallback
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.blob.core.windows.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
