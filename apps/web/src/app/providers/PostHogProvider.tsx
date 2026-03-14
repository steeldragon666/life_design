'use client';

/**
 * PostHog analytics provider for the Life Design web app.
 *
 * Initialises PostHog once on mount in production, wires up automatic page-view
 * capture via the Next.js App Router, and exposes a `useAnalytics()` hook for
 * event tracking throughout the app.
 *
 * Usage:
 *   Wrap root layout children with <PostHogProvider>.
 *   Then call useAnalytics() from any client component.
 *
 * PostHog is imported dynamically so the build does not fail if posthog-js
 * has not yet been installed (run: pnpm add posthog-js in apps/web).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// ─── Event catalogue ─────────────────────────────────────────────────────────

/**
 * Every event name tracked by the Life Design app.
 * Keeping these in a union type prevents typos at call sites.
 */
export type AnalyticsEvent =
  | 'checkin_completed'
  | 'insight_viewed'
  | 'correlation_explored'
  | 'subscription_started'
  | 'subscription_canceled'
  | 'trial_converted'
  | 'onboarding_step_completed'
  | 'onboarding_abandoned'
  | 'mentor_message_sent'
  | 'connector_linked';

/** Loose property bag — PostHog accepts arbitrary JSON. */
export type EventProperties = Record<string, string | number | boolean | null | undefined>;

// ─── Context ─────────────────────────────────────────────────────────────────

interface AnalyticsContextValue {
  /**
   * Send a typed product event to PostHog.
   *
   * @param event - One of the pre-defined `AnalyticsEvent` names.
   * @param properties - Optional metadata attached to the event.
   */
  track: (event: AnalyticsEvent, properties?: EventProperties) => void;

  /**
   * Identify the current authenticated user so future events are attributed.
   * Call this immediately after a successful sign-in.
   *
   * @param userId - The Supabase auth.uid() for the user.
   * @param traits - Optional user-level properties (plan, created_at, etc.).
   */
  identify: (userId: string, traits?: EventProperties) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue>({
  track: () => undefined,
  identify: () => undefined,
});

// ─── PostHog dynamic import type ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PostHogInstance = any;

// ─── Provider ────────────────────────────────────────────────────────────────

interface PostHogProviderProps {
  children: ReactNode;
}

/**
 * Root analytics provider. Mount once inside the root layout, outside of
 * Suspense, so the page-view listener has access to the router.
 *
 * PostHog is only initialised in production (NODE_ENV === 'production') and
 * when both NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST are set.
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  const posthogRef = useRef<PostHogInstance | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Initialise once on mount ──────────────────────────────────────────────
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

    if (process.env.NODE_ENV !== 'production' || !key) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[analytics] PostHog disabled in development. Events will be logged here.');
      }
      return;
    }

    // Dynamic import prevents a build error when posthog-js is not installed.
    import('posthog-js')
      .then((mod) => {
        const posthog: PostHogInstance = mod.default;

        posthog.init(key, {
          api_host: host,
          // Capture page views manually so we control timing with App Router.
          capture_pageview: false,
          respect_dnt: true,
          disable_session_recording: true,
          persistence: 'localStorage+cookie',
        });

        posthogRef.current = posthog;
        posthog.capture('$pageview');
      })
      .catch((err) => {
        console.warn('[analytics] Failed to load posthog-js:', err);
      });

    return () => {
      posthogRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Page-view tracking on route change ───────────────────────────────────
  useEffect(() => {
    if (!posthogRef.current) return;
    const url =
      window.origin +
      pathname +
      (searchParams.toString() ? `?${searchParams.toString()}` : '');
    posthogRef.current.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  // ── Stable callbacks ──────────────────────────────────────────────────────

  const track = useCallback((event: AnalyticsEvent, properties?: EventProperties) => {
    if (posthogRef.current) {
      posthogRef.current.capture(event, properties);
    } else if (process.env.NODE_ENV === 'development') {
      console.debug(`[analytics] track("${event}", ${JSON.stringify(properties ?? {})})`);
    }
  }, []);

  const identify = useCallback((userId: string, traits?: EventProperties) => {
    if (posthogRef.current) {
      posthogRef.current.identify(userId, traits);
    } else if (process.env.NODE_ENV === 'development') {
      console.debug(`[analytics] identify("${userId}", ${JSON.stringify(traits ?? {})})`);
    }
  }, []);

  return (
    <AnalyticsContext.Provider value={{ track, identify }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns stable `track` and `identify` functions for the current component.
 *
 * Must be called inside a component that is a descendant of <PostHogProvider>.
 *
 * @returns `{ track, identify }`
 *
 * @example
 * ```tsx
 * const { track } = useAnalytics();
 * track('checkin_completed', { mode: 'quick', mood_score: 8 });
 * ```
 */
export function useAnalytics(): AnalyticsContextValue {
  return useContext(AnalyticsContext);
}
