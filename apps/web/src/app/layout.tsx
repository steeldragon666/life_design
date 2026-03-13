import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppProviders from '@/components/app-providers';

export const metadata: Metadata = {
  title: 'Life Design | Your Personal Intelligence Platform',
  description: 'Synthesize your life context, track goals across all dimensions, and design your future with AI-powered insights.',
  keywords: ['life design', 'goal tracking', 'personal development', 'AI coaching', 'life balance'],
  authors: [{ name: 'Life Design' }],
  creator: 'Life Design',
  publisher: 'Life Design',
  metadataBase: new URL('https://life-design-brown.vercel.app'),
  openGraph: {
    title: 'Life Design | Your Personal Intelligence Platform',
    description: 'Transform your life data into actionable wisdom. Track goals, gain insights, design your future.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Life Design',
    images: [{
      url: '/images/life-design-hero-illustration.png',
      width: 1200,
      height: 630,
      alt: 'Life Design - Your Personal Intelligence Platform',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Life Design | Your Personal Intelligence Platform',
    description: 'Transform your life data into actionable wisdom.',
    images: ['/images/life-design-hero-illustration.png'],
  },
  icons: {
    icon: [
      { url: '/images/life-orb-3d-icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/images/life-orb-3d-icon.png', sizes: '512x512' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'Life Design',
    statusBarStyle: 'black-translucent',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0e17' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* iOS Touch Icon */}
        <link rel="apple-touch-icon" href="/images/life-orb-3d-icon.png" />
        {/* iOS Startup Image */}
        <link rel="apple-touch-startup-image" href="/images/life-design-hero-illustration.png" />
        {/* Prevent text size adjustment on orientation change */}
        <meta name="format-detection" content="telephone=no" />
        {/* Apple Mobile Web App */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Life Design" />
        {/* iOS Smart App Banner */}
        <meta name="apple-itunes-app" content="app-id=123456789, app-argument=life-design-brown.vercel.app" />
      </head>
      <body className="antialiased min-h-screen bg-[#0a0e17] text-white overflow-x-hidden">
        {/* iOS Safe Area Support */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[#0a0e17]" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
        </div>
        <AppProviders>
          <div className="relative z-10 min-h-screen">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}
