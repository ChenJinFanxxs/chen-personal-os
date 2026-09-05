const CACHE = 'personal-os-shell-v1';
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/manifest.webmanifest', '/icons/workspace-192.png', '/icons/workspace-512.png']))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('personal-os-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.includes('signin') || url.pathname.includes('callback') || url.search) return;
  if (event.request.mode !== 'navigate' && !/\.(js|css|woff2?|png|svg|webmanifest)$/.test(url.pathname)) return;
  event.respondWith(fetch(event.request).then(response => {
    // Page HTML contains only the public shell; private data is fetched separately.
    if (response.ok && !response.redirected && (event.request.mode === 'navigate' || !/no-store|private/.test(response.headers.get('cache-control') || ''))) {
      const copy = response.clone(); void caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(async () => (await caches.match(event.request)) || new Response('暂时离线，请联网后重新打开。', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } })));
});
