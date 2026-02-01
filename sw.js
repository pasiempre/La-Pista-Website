// LaPista Service Worker v4.1 - Added auth & account pages
const CACHE_NAME = 'lapista-v4.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/about-page.html',
  '/faq-page.html',
  '/contact-page.html',
  '/game-details.html',
  '/confirmation-page.html',
  '/cancel.html',
  '/terms.html',
  '/waiver.html',
  '/profile-page.html',
  '/edit-profile-page.html',
  '/login-page.html',
  '/register-page.html',
  '/my-games.html',
  '/payment-methods.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/qrcode.min.js',
  '/js/translations.js',
  '/js/i18n.js',
  '/js/auth.js',
  '/js/avatars.js',
  '/lapista%20cashapp%20qr.jpg',
  '/LaPista Logo 1.png',
  '/Game photo 1.png',
  '/Game photo 2.png',
  // Videos not cached (too large for service worker cache)
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first for API, cache first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external URLs (Stripe, CDNs, etc.) - let browser handle them directly
  if (url.origin !== location.origin) return;

  // API requests - network first, no cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => new Response(JSON.stringify({ error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' }
        }))
    );
    return;
  }

  // Static assets - cache first, then network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update cache in background
          event.waitUntil(
            fetch(request).then((response) => {
              // Only cache complete responses (not 206 partial)
              if (response.ok && response.status !== 206) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, response);
                });
              }
            }).catch(() => {})
          );
          return cachedResponse;
        }
        
        // Not in cache - fetch from network
        return fetch(request).then((response) => {
          // Cache successful complete responses only (not 206 partial)
          if (response.ok && response.status !== 206) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
  );
});
