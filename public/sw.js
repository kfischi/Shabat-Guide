/* Multibrawn PWA service worker.
   - Never touches gated/dynamic endpoints (/guide, /ai, /grow-webhook, functions):
     those always go to the network so auth + the AI advisor keep working.
   - Public pages/assets: network-first for navigations (fresh when online,
     cached fallback offline), cache-first for other same-origin GETs. */
const CACHE = 'mb-app-v1';
const SHELL = ['/', '/index.html', '/upsell.html', '/thank-you.html', '/thank-you-lead.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // Netlify Forms POST, webhook POST, etc. — untouched
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // fonts / Anthropic / external — untouched

  // Gated + dynamic: bypass the SW entirely (network only)
  if (
    url.pathname.startsWith('/guide') ||
    url.pathname.startsWith('/ai') ||
    url.pathname.startsWith('/grow-webhook') ||
    url.pathname.startsWith('/.netlify/')
  ) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return res; })
        .catch(() => caches.match(req).then((m) => m || caches.match('/index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((res) => {
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
      return res;
    }).catch(() => m))
  );
});
