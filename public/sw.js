// SPIELFERTIG‽ – Service Worker
const CACHE = 'spielfertig-v1';
const PRECACHE = ['/', '/index.html'];

// Install: cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for static assets, network-only for Supabase API
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Skip non-GET, Supabase API, and auth calls
  if (
    e.request.method !== 'GET' ||
    url.includes('supabase.co') ||
    url.includes('api.anthropic.com')
  ) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(response => {
        // Cache fresh static assets
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: return cached or fallback to index.html
        return cached || caches.match('/index.html');
      });
      // Return cache immediately if available, update in background
      return cached || network;
    })
  );
});
