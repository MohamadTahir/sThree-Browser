import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production builds are a static export (out/) for both targets: Tauri
// loads it on desktop, and static-web-server serves it on the web (see
// sws.toml). The app needs no server: every S3 request is made from the
// user's browser. Only `next dev` runs a server, and it sends the same
// headers that sws.toml sends in production.
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
  ...(isDev
    ? {
        async headers() {
          return [{ source: '/:path*', headers: securityHeaders }];
        },
      }
    : { output: 'export' }),
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    return config;
  },

  // Add empty turbopack config to use webpack instead
  turbopack: {},
};

export default nextConfig;
