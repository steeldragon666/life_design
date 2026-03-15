'use client';

import { useEffect, type ReactNode } from 'react';
import { GuestProvider } from '@/lib/guest-context';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { SoundscapeProvider } from '@/components/audio/soundscape-provider';
import ResilientErrorBoundary, { GlassErrorFallbackCard } from '@/components/error/resilient-error-boundary';
import { LifeDesignProvider } from '@/providers/LifeDesignProvider';

const AppProviderErrorBoundary = ResilientErrorBoundary as any;

export default function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <AppProviderErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6">
          <GlassErrorFallbackCard
            title="Companion space recovering"
            description="A provider failed to initialize. Refresh to continue your journey."
            className="max-w-xl w-full"
          />
        </div>
      }
    >
      <ThemeProvider>
        <GuestProvider>
          <LifeDesignProvider>
            <SoundscapeProvider>{children}</SoundscapeProvider>
          </LifeDesignProvider>
        </GuestProvider>
      </ThemeProvider>
    </AppProviderErrorBoundary>
  );
}
