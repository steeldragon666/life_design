/**
 * Life Design — Service Worker
 *
 * Strategy overview:
 *   - Static assets (fonts, icons, CSS, JS chunks): Cache-first with long TTL
 *   - API calls (/api/**):                          Network-first, fall back to cache
 *   - Dynamic pages:                                Network-first, fall back to cache
 *   - Background sync:                              Queue offline check-in POSTs
 *   - Push notifications:                           Stub ready for FCM / Web Push
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `life-design-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `life-design-dynamic-${CACHE_VERSION}`;
const SYNC_QUEUE_KEY = 'offline-checkin-queue';

/** Assets to pre-cache on install. */
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

/** URL patterns that should use cache-first strategy. */
const STATIC_PATTERNS = [
  /\/icons\//,
  /\.(?:woff2?|ttf|otf|eot)$/,
  /\.(?:css|js)$/,
  /api\.fontshare\.com/,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
];

/** URL patterns that should always go network-first. */
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /supabase\.co/,
];

// ---------------------------------------------------------------------------
// Install — pre-cache static shell
// ---------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ---------------------------------------------------------------------------
// Activate — clean up stale caches
// ---------------------------------------------------------------------------

self.addEventListener('activate', (event) => {
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
      .then(() => self.clients.claim()),
  );
});

// ---------------------------------------------------------------------------
// Fetch — routing logic
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
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

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Only cache API responses, NOT HTML pages — stale HTML causes
    // redirect loops and prevents design updates from reaching users.
    const isPageRequest = request.headers.get('accept')?.includes('text/html');
    if (networkResponse.ok && !isPageRequest) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (_e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match('/');
    return offline ?? new Response('Offline', { status: 503 });
  }
}

// ---------------------------------------------------------------------------
// Background sync — offline check-in queue
// ---------------------------------------------------------------------------

self.addEventListener('sync', (event) => {
  if (event.tag === 'checkin-sync') {
    event.waitUntil(flushCheckinQueue());
  }
});

async function flushCheckinQueue() {
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
      } catch (_e) {
        // Keep in queue; will be retried on next sync event
      }
    }),
  );
}

// ---------------------------------------------------------------------------
// Push notifications — stub
// ---------------------------------------------------------------------------

self.addEventListener('push', (event) => {
  const data = event.data?.json();
  if (!data) return;

  event.waitUntil(
    self.registration.showNotification(
      data.title ?? 'Life Design',
      {
        body: data.body ?? 'You have a new update.',
        icon: data.icon ?? '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url: data.url ?? '/dashboard' },
      },
    ),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/dashboard';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(targetUrl));
        if (existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      }),
  );
});
