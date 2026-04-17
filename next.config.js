import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if building for Tauri (via environment variable)
const isTauriBuild = process.env.TAURI_BUILD === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone for Docker/production deployment, or export for Tauri
  output: isTauriBuild ? 'export' : 'standalone',

  // Disable server-side rendering for pages (use client components)
  reactStrictMode: true,

  // Use webpack instead of Turbopack (for compatibility with existing config)
  webpack: (config) => {
    const aliases = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    // Tauri build: use stubs so we don't bundle Node AWS SDK (desktop uses Rust backend)
    if (isTauriBuild) {
      aliases['@/lib/s3Client'] = path.resolve(__dirname, './src/lib/__tauri-stubs__/s3Client');
      aliases['@aws-sdk/client-s3'] = path.resolve(__dirname, './src/lib/__tauri-stubs__/aws-sdk-client-s3');
      aliases['@aws-sdk/s3-request-presigner'] = path.resolve(__dirname, './src/lib/__tauri-stubs__/aws-sdk-presigner');
    }
    config.resolve.alias = aliases;
    return config;
  },

  // Add empty turbopack config to use webpack instead
  turbopack: {},

  // Disable image optimization for static export (Tauri)
  ...(isTauriBuild && {
    images: {
      unoptimized: true,
    },
  }),

  // For Tauri, we need to handle CORS (only for web build)
  ...(!isTauriBuild && {
    async headers() {
      return [
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Credentials', value: 'true' },
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
            { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
          ],
        },
      ];
    },
  }),
};

export default nextConfig;
