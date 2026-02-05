const CACHE_NAME = 'project-manager-v2';
const API_CACHE = 'pm-api-cache-v1';
const MUTATION_QUEUE = 'pm-mutation-queue';
const OFFLINE_URL = '/';

// Static assets to precache
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install — precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE && key !== MUTATION_QUEUE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET for caching (mutations handled separately)
  if (request.method !== 'GET') {
    // Queue mutations when offline
    if (!navigator.onLine && (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE')) {
      event.respondWith(handleOfflineMutation(request));
      return;
    }
    return;
  }

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify({ success: false, offline: true, error: 'You are offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            });
          });
        })
    );
    return;
  }

  // Static assets: cache-first for performance
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // HTML pages: network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});

// Handle offline mutations — queue them
async function handleOfflineMutation(request) {
  try {
    const body = await request.clone().text();
    const mutation = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now(),
    };

    // Store in IndexedDB-like approach via cache API
    const cache = await caches.open(MUTATION_QUEUE);
    const queueKey = `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const queueResponse = new Response(JSON.stringify(mutation), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(new Request(`/offline-queue/${queueKey}`), queueResponse);

    // Return a synthetic success response
    return new Response(JSON.stringify({
      success: true,
      offline: true,
      queued: true,
      message: 'Saved offline — will sync when back online',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Failed to queue offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Sync queued mutations when back online
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'SYNC_OFFLINE') {
    await syncOfflineMutations();
    // Notify all clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE' }));
  }
});

async function syncOfflineMutations() {
  try {
    const cache = await caches.open(MUTATION_QUEUE);
    const keys = await cache.keys();
    
    for (const key of keys) {
      const response = await cache.match(key);
      if (!response) continue;
      
      const mutation = await response.json();
      try {
        await fetch(mutation.url, {
          method: mutation.method,
          headers: mutation.headers,
          body: mutation.body,
        });
        await cache.delete(key);
      } catch {
        // Will retry next sync
        console.log('Failed to sync mutation, will retry:', key.url);
      }
    }
  } catch (err) {
    console.error('Sync failed:', err);
  }
}

// Background sync (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncOfflineMutations());
  }
});
