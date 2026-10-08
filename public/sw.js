// Reunite service worker: keeps the app shell, scripts, styles and fonts so the app opens with no network
// after the first visit. API calls (/api/: sync, voice, status, link panel) are never cached.
const CACHE = 'reunite-shell-v2';
const SHELL = ['/', '/manifest.json', '/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png'];
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
      // A production build lists its hashed files (scripts, styles, fonts) in precache.json; dev has none.
      try {
        const res = await fetch('/precache.json', { cache: 'no-store' });
        if (res.ok) await cache.addAll(await res.json());
      } catch {
        /* dev server: files are cached as they load */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

/** Network first, so updates show at once; the cached copy when offline or the network is too slow. */
async function networkFirst(request, cacheKey = request) {
  const cache = await caches.open(CACHE);
  const network = fetch(request).then(res => {
    if (res.ok && res.type === 'basic') cache.put(cacheKey, res.clone());
    return res;
  });
  const cached = await cache.match(cacheKey);
  if (!cached) return network;
  const timeout = new Promise(resolve => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS));
  return Promise.race([network.catch(() => cached), timeout]);
}

/** Hashed build files never change: the cached copy first. */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) (await caches.open(CACHE)).put(request, res.clone());
  return res;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // never cache sync, voice, status or the link panel

  if (request.mode === 'navigate') {
    // Every page (/, /console, /family, /status, /phone) is the same single-page shell.
    event.respondWith(networkFirst(request, '/').catch(() => caches.match('/')));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request).catch(() => caches.match(request)));
  }
});
