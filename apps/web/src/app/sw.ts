/**
 * Life Design — Service Worker
 *
 * Strategy overview:
 *   - Static assets (fonts, icons, CSS, JS chunks): Cache-first with long TTL
 *   - API calls (/api/**):                          Network-first, fall back to cache
 *   - Dynamic pages:                                Network-first, fall back to cache
 *   - Background sync:                              Queue offline check-in POSTs
 *   - Push notifications:                           Stub ready for FCM / Web Push
 *
 * NOTE: This file is a plain Service Worker — no React, no Next.js APIs.
 * Register from layout.tsx or a next-pwa integration.
 */

// TypeScript declarations for Service Worker global scope
declare const self: ServiceWorkerGlobalScope;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CACHE_VERSION = 'v1';
// Cache names kept as "life-design-*" intentionally — renaming would invalidate
// all existing caches and force full re-downloads for active users.
const STATIC_CACHE = `life-design-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `life-design-dynamic-${CACHE_VERSION}`;
const SYNC_QUEUE_KEY = 'offline-checkin-queue';

/** Assets to pre-cache on install (cache-first candidates). */
const PRECACHE_URLS: string[] = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

/** URL patterns that should use cache-first strategy. */
const STATIC_PATTERNS: RegExp[] = [
  /\/icons\//,
  /\.(?:woff2?|ttf|otf|eot)$/,
  /\.(?:css|js)$/,
  /api\.fontshare\.com/,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
];

/** URL patterns that should always go network-first. */
const NETWORK_FIRST_PATTERNS: RegExp[] = [
  /\/api\//,
  /supabase\.co/,
];

// ---------------------------------------------------------------------------
// Install — pre-cache static shell
// ---------------------------------------------------------------------------

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => (self as ServiceWorkerGlobalScope).skipWaiting()),
  );
});

// ---------------------------------------------------------------------------
// Activate — clean up stale caches
// ---------------------------------------------------------------------------

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => (self as ServiceWorkerGlobalScope).clients.claim()),
  );
});

// ---------------------------------------------------------------------------
// Fetch — routing logic
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept GET requests
  if (request.method !== 'GET') return;

  // Network-first for API and Supabase calls
  if (NETWORK_FIRST_PATTERNS.some((p) => p.test(url.href))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for static assets and fonts
  if (STATIC_PATTERNS.some((p) => p.test(url.href))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first for everything else (pages, dynamic content)
  event.respondWith(networkFirst(request));
});

// ---------------------------------------------------------------------------
// Strategy helpers
// ---------------------------------------------------------------------------

/**
 * Cache-first: return cached response immediately; fetch & update in background.
 * Ideal for versioned static assets and fonts.
 */
async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

/**
 * Network-first: try network; on failure serve stale cache.
 * Ideal for API responses and dynamic pages.
 */
async function networkFirst(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline fallback page if available
    const offline = await caches.match('/');
    return offline ?? new Response('Offline', { status: 503 });
  }
}

// ---------------------------------------------------------------------------
// Background sync — offline check-in queue
// ---------------------------------------------------------------------------

/**
 * When the network returns, replay any check-in POST requests that failed offline.
 * Register the sync tag from the app with:
 *   navigator.serviceWorker.ready.then(sw => sw.sync.register('checkin-sync'))
 */
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'checkin-sync') {
    event.waitUntil(flushCheckinQueue());
  }
});

async function flushCheckinQueue(): Promise<void> {
  const cache = await caches.open(SYNC_QUEUE_KEY);
  const requests = await cache.keys();

  await Promise.all(
    requests.map(async (req) => {
      try {
        const cachedResponse = await cache.match(req);
        if (!cachedResponse) return;

        const body = await cachedResponse.text();
        const response = await fetch(req.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        if (response.ok) {
          await cache.delete(req);
        }
      } catch {
        // Keep in queue; will be retried on next sync event
      }
    }),
  );
}

// ---------------------------------------------------------------------------
// Push notifications — stub
// ---------------------------------------------------------------------------

/**
 * Handles incoming push payloads from the server.
 * Integrate with a Web Push provider (e.g. Supabase Edge Function + FCM)
 * to populate the payload.
 */
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() as {
    title?: string;
    body?: string;
    icon?: string;
    url?: string;
  } | null;

  if (!data) return;

  event.waitUntil(
    (self as ServiceWorkerGlobalScope).registration.showNotification(
      data.title ?? 'Opt In',
      {
        body: data.body ?? 'You have a new update.',
        icon: data.icon ?? '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url: data.url ?? '/dashboard' },
      },
    ),
  );
});

/** Open the app (or focus existing tab) when a notification is clicked. */
self.addEventListener('notificationclick', (event: NotificationClickEvent) => {
  event.notification.close();

  const targetUrl = (event.notification.data as { url?: string })?.url ?? '/dashboard';

  event.waitUntil(
    (self as ServiceWorkerGlobalScope).clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(targetUrl));
        if (existing) return existing.focus();
        return (self as ServiceWorkerGlobalScope).clients.openWindow(targetUrl);
      }),
  );
});
