const CACHE_NAME = 'aura-audtex-pwa-v9';
const assetUrl = (path) => new URL(path, self.registration.scope).toString();
const STATIC_ASSETS = ['index.html', 'manifest.json', 'favicon.svg', 'icons.svg'].map(assetUrl);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && !key.includes('transformers') && !key.includes('onnx')) {
            console.log('[SW] Evicting legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Do not intercept non-GET requests or backend API calls
  if (event.request.method !== 'GET') return;
  if (url.pathname.endsWith('/health') || url.pathname.endsWith('/transcribe')) return;
  if (url.protocol === 'chrome-extension:' || url.protocol === 'blob:') return;

  // CRITICAL FOR SAFARI/IOS WEBKIT:
  // Bypass Service Worker completely for external model weights CDNs and Range requests.
  // Safari WebKit fails with "TypeError: Failed to fetch" if a Service Worker intercepts cross-origin Range requests.
  if (
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('huggingface.co') ||
    url.hostname.includes('hf.co') ||
    url.hostname.includes('unpkg.com') ||
    event.request.headers.has('range')
  ) {
    return;
  }

  // Network-First for HTML navigation so updates appear immediately
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached and refresh in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Offline fallback to index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match(assetUrl('index.html'));
        }
      });
    })
  );
});
