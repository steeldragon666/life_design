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
    <html lang="en">
      <head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme colour for browser chrome and mobile status bar */}
        <meta name="theme-color" content="#FAFAF8" />

        {/* iOS PWA support */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Life Design" />
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />

        {/* Google Fonts: DM Sans (body), Instrument Serif (headings), DM Mono (data) */}
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
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap"
        />
      </head>
      <body className="antialiased selection:bg-sage-500/30">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
