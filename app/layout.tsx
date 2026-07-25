import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Broadcast - Social Media Studio",
  description:
    "Turn one blog post into multi-platform campaigns: variants, captions, idempotent publish against a fake platform.",
  icons: {
    icon: [{ url: "/favicon.svg?v=1", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Sora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.svg?v=1" type="image/svg+xml" />
      </head>
      <body className="min-h-screen antialiased font-sans text-ink bg-canvas">
        {children}
      </body>
    </html>
  );
}
