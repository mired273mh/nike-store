import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async rewrites() {
    const api = process.env.PHP_API_ORIGIN || 'http://127.0.0.1:8000';
    return {
      beforeFiles: [
        { source: '/api/:path*', destination: `${api}/api/:path*` },
        { source: '/uploads/:path*', destination: `${api}/uploads/:path*` },
      ],
    };
  },
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
