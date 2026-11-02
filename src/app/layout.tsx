import type { Metadata, Viewport } from "next";
import "react-toastify/dist/ReactToastify.css";
import "../index.css";

export const metadata: Metadata = {
  title: "sThree Browser",
  description: "Browse S3 buckets with credentials that never leave your device.",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "64x64" },
    ],
    apple: "/logo.png",
  },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#15171b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
