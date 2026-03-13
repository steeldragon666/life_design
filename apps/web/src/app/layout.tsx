import type { Metadata } from 'next';
import './globals.css';
import AppProviders from '@/components/app-providers';

export const metadata: Metadata = {
  title: 'Life Design — Your entire life, intelligently connected',
  description:
    'Discover hidden patterns across health, career, relationships and growth. AI-powered insights that connect all 8 dimensions of your life.',
  openGraph: {
    title: 'Life Design — Your entire life, intelligently connected',
    description:
      'Discover hidden patterns across health, career, relationships and growth.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Life Design — Your entire life, intelligently connected',
    description:
      'Discover hidden patterns across health, career, relationships and growth.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme colour for browser chrome and mobile status bar */}
        <meta name="theme-color" content="#6366f1" />

        {/* iOS PWA support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Life Design" />
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />

        {/* Cabinet Grotesk — Headings */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700,500&display=swap"
        />
        {/* Erode — Body text */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=erode@300,400,500&display=swap"
        />
        {/* JetBrains Mono — Data/Numbers */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap"
        />
      </head>
      <body className="antialiased selection:bg-indigo-500/30">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
