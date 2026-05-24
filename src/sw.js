/// <reference types="vite/client" />
/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

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
