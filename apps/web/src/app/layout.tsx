import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Life Design OS | Holistic Intelligence Platform',
  description: 'Synthesize your world context, user performance, and intent into a cohesive life strategy.',
  openGraph: {
    title: 'Life Design OS',
    description: 'Transform your life data into actionable wisdom.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-indigo-500/30">
        {children}
      </body>
    </html>
  );
}
