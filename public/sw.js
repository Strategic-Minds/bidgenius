// BidGenius Service Worker v2.0
// Security posture: cache only immutable public assets. Never cache API, proposal, approval or account data.

const STATIC_CACHE = 'bidgenius-static-v2';
const STATIC_ASSETS = [
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Sensitive and dynamic application data must always come from the network.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Navigation is network-only with a static offline fallback. Dynamic pages are not cached.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(async () => {
        const offline = await caches.match('/offline');
        return offline || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // Only immutable Next.js build assets and explicitly listed public assets are cacheable.
  if (url.pathname.startsWith('/_next/static/') || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirstPublicAsset(request));
  }
});

async function cacheFirstPublicAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

// Background bid replay is intentionally disabled. Proposal payloads may contain PII,
// pricing and customer data and must not be stored in Cache Storage without an approved
// encrypted offline-data design and authenticated idempotent replay protocol.
self.addEventListener('sync', () => {});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { body: event.data.text() };
  }

  const requestedUrl = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/';
  event.waitUntil(
    self.registration.showNotification(data.title || 'BidGenius', {
      body: data.body || 'You have a new update.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data: { url: requestedUrl },
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const requestedUrl = event.notification?.data?.url;
  const safeUrl = typeof requestedUrl === 'string' && requestedUrl.startsWith('/') ? requestedUrl : '/';
  event.waitUntil(clients.openWindow(safeUrl));
});
