// QBM-HydroNet Service Worker v1.0
// Enables offline access, caches essential assets, and handles background sync.

const CACHE_NAME = 'hydronet-v1'
const OFFLINE_URL = '/offline'

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/login',
  '/manifest.json',
  '/offline',
]

// ─── Install: Pre-cache essential assets ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching essential assets')
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to pre-cache:', err)
      })
    })
  )
  // Activate immediately (don't wait for old SW to finish)
  self.skipWaiting()
})

// ─── Activate: Clean up old caches ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  // Take control of all pages immediately
  self.clients.claim()
})

// ─── Fetch: Network-first with cache fallback ───
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests  
  if (request.method !== 'GET') return

  // Skip API calls, SSE streams, and external resources
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('stream') ||
    url.origin !== self.location.origin
  ) {
    return
  }

  // Skip _next/webpack HMR in dev
  if (url.pathname.includes('_next/webpack') || url.pathname.includes('__nextjs')) {
    return
  }

  event.respondWith(
    // Try network first
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(async () => {
        // Network failed — try cache
        const cached = await caches.match(request)
        if (cached) return cached

        // For navigation requests, show offline page
        if (request.mode === 'navigate') {
          const offlinePage = await caches.match(OFFLINE_URL)
          if (offlinePage) return offlinePage
        }

        // Final fallback
        return new Response('Offline — QBM-HydroNet is not available', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        })
      })
  )
})

// ─── Background Sync: Queue sensor data when offline ───
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sensor-data') {
    event.waitUntil(syncSensorData())
  }
})

async function syncSensorData() {
  // Read pending data from IndexedDB and POST to server
  console.log('[SW] Background sync: uploading queued sensor data')
  // Implementation depends on IndexedDB queue — placeholder for now
}

// ─── Push Notifications ───
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  
  const options = {
    body: data.body || 'New notification from QBM-HydroNet',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || 'hydronet-notification',
    data: { url: data.url || '/dashboard' },
    vibrate: [200, 100, 200],
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || '🌱 QBM-HydroNet',
      options
    )
  )
})

// Open app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url)
    })
  )
})
