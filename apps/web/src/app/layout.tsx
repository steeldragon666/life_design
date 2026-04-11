import type { Metadata } from 'next';
import { DM_Sans, DM_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';
import AppProviders from '@/components/app-providers';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Opt In — Your entire life, intelligently connected',
  description:
    'Discover hidden patterns across health, career, relationships and growth. AI-powered insights that connect all 8 dimensions of your life.',
  openGraph: {
    title: 'Opt In — Your entire life, intelligently connected',
    description:
      'Discover hidden patterns across health, career, relationships and growth.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Opt In — Your entire life, intelligently connected',
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
    <html lang="en" className={`${dmSans.variable} ${instrumentSerif.variable} ${dmMono.variable}`}>
      <head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme colour for browser chrome and mobile status bar */}
        <meta name="theme-color" content="#FAFAF8" />

        {/* iOS PWA support */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Opt In" />
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />
      </head>
      <body className="font-sans antialiased selection:bg-sage-500/30">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
