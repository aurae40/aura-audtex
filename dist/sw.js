const CACHE_NAME = 'aura-audtex-pwa-v14';
const assetUrl = (path) => new URL(path, self.registration.scope).toString();
const STATIC_ASSETS = ['index.html', 'manifest.json', 'favicon.svg', 'icons.svg'].map(assetUrl);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && !key.includes('transformers') && !key.includes('onnx')) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Bypass all cross-origin requests (CDNs, HF weights, remote Whisper servers, dictionaries)
  if (url.origin !== self.location.origin) return;

  // Bypass byte-range requests (critical for iOS Safari <audio> playback and seeking)
  if (req.headers.has('range')) return;

  // Bypass backend API and cached media stream routes
  if (
    url.pathname.startsWith('/audio/') ||
    url.pathname.endsWith('/health') ||
    url.pathname.endsWith('/models') ||
    url.pathname.endsWith('/llm-status') ||
    url.pathname.endsWith('/analyze') ||
    url.pathname.endsWith('/ask') ||
    url.pathname.includes('/transcribe')
  ) {
    return;
  }

  // Network-first for HTML navigation so updates arrive immediately
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match(assetUrl('index.html'))) || Response.error())
    );
    return;
  }

  // Stale-while-revalidate for same-origin static assets
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || Response.error());

      return cached || networkFetch;
    })
  );
});
