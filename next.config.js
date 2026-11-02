import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Desktop builds are a static export loaded by Tauri; web builds run the
// standalone Next.js server (Docker).
const isTauriBuild = process.env.TAURI_BUILD === 'true';
const isDev = process.env.NODE_ENV !== 'production';

// S3 endpoints are user-configured, so object previews and API calls must be
// allowed to any http(s) origin. Scripts, frames and plugins stay locked down.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: http:",
  "media-src 'self' blob: https: http:",
  // ipc: is the Tauri bridge, used when `tauri dev` loads this dev server.
  "connect-src 'self' https: http: ipc: http://ipc.localhost",
  "font-src 'self' data:",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  // Presigned URLs must never leak to other sites through the Referer header.
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isTauriBuild ? 'export' : 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    return config;
  },

  // Add empty turbopack config to use webpack instead
  turbopack: {},

  ...(isTauriBuild
    ? { images: { unoptimized: true } }
    : {
        async headers() {
          return [{ source: '/:path*', headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
