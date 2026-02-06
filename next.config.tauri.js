import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Tauri (no API routes needed since Tauri uses Rust backend)
  output: 'export',
  
  // Disable server-side rendering
  reactStrictMode: true,
  
  // Configure for Tauri
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    return config;
  },

  // Add empty turbopack config to use webpack instead
  turbopack: {},
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
