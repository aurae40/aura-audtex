const CACHE_NAME = 'aura-audtex-pwa-v17';
const SHARE_INBOX_CACHE = 'aura-share-target-inbox-v1';
const SHARE_INBOX_KEY = '/__aura_shared_audio__';

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
          if (
            key !== CACHE_NAME &&
            key !== SHARE_INBOX_CACHE &&
            !key.includes('transformers') &&
            !key.includes('onnx')
          ) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

async function handleShareTargetPost(request) {
  try {
    const formData = await request.formData();
    const sharedFile = formData.get('audio');
    const title = String(formData.get('title') || '');
    const text = String(formData.get('text') || '');
    const sharedUrl = String(formData.get('url') || '');

    const redirectUrl = new URL('./', self.registration.scope);
    redirectUrl.searchParams.set('shared', '1');

    if (sharedFile && typeof sharedFile === 'object' && 'size' in sharedFile && sharedFile.size > 0) {
      const cache = await caches.open(SHARE_INBOX_CACHE);
      const headers = new Headers({
        'Content-Type': sharedFile.type || 'audio/mp4',
        'X-Aura-Filename': encodeURIComponent(sharedFile.name || 'Shared_Audio.m4a'),
      });
      await cache.put(SHARE_INBOX_KEY, new Response(sharedFile, { headers }));
      if (title) redirectUrl.searchParams.set('shared_title', title);
      return Response.redirect(redirectUrl.toString(), 303);
    }

    if (sharedUrl) redirectUrl.searchParams.set('shared_url', sharedUrl);
    if (text) redirectUrl.searchParams.set('shared_text', text);
    if (title) redirectUrl.searchParams.set('shared_title', title);
    return Response.redirect(redirectUrl.toString(), 303);
  } catch (err) {
    console.warn('[SW] Share target error:', err);
    return Response.redirect(new URL('./', self.registration.scope).toString(), 303);
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Intercept native OS/PWA Share Target POST submissions
  if (req.method === 'POST' && url.origin === self.location.origin && url.pathname.endsWith('/share-target')) {
    event.respondWith(handleShareTargetPost(req));
    return;
  }

  if (req.method !== 'GET') return;

  // Bypass all cross-origin requests (CDNs, HF weights, remote Whisper servers, dictionaries)
  if (url.origin !== self.location.origin) return;

  // Bypass byte-range requests (critical for iOS Safari <audio> playback and seeking)
  if (req.headers.has('range')) return;

  // Bypass backend API and cached media stream routes
  if (
    url.pathname.startsWith('/audio/') ||
    url.pathname.startsWith('/ws/') ||
    url.pathname.startsWith('/meeting/') ||
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
        .catch(
          async () =>
            (await caches.match(req)) ||
            (await caches.match(assetUrl('index.html'))) ||
            Response.error()
        )
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
