/// <reference types="vite/client" />
/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(
  ({ url }) =>
    url.hostname.includes('supabase.co') &&
    url.pathname.includes('/storage/v1/object/public/'),
  new StaleWhileRevalidate({
    cacheName: 'cache-v1-storage',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  }),
)

self.addEventListener('activate', (event) => {
  const current = ['cache-v1-storage']
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('cache-v') && !current.includes(k))
          .map((k) => caches.delete(k)),
      ),
    ),
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: event.data.text() }
  }

  const options = {
    tag: data.notification_id ?? undefined,
    body: data.body ?? '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: {
      url: data.url ?? '/',
      notificationId: data.notification_id,
    },
    requireInteraction: true,
    vibrate: [200, 100, 200],
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? '새 알림', options),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = new URL(event.notification.data?.url ?? '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const matchingClient = windowClients.find(
        (client) => client.url === urlToOpen && 'focus' in client,
      )
      if (matchingClient) {
        return matchingClient.focus()
      }
      return self.clients.openWindow(urlToOpen)
    }),
  )
})
