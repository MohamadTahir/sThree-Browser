import type { Metadata } from "next";
import "../index.css";

export const metadata: Metadata = {
  title: "sThree Browser",
  description: "Modern S3 Bucket Browser Desktop Application",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
