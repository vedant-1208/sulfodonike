// This service worker runs independently of any open tab. Android/Chrome
// (and most desktop browsers) will wake it up when a push message arrives
// from the browser's push service, even if the site isn't open at all.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Fired when the OS/browser delivers a push message sent via web-push.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'New order', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'New order'
  const options = {
    body: data.body || '',
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    data: { url: data.url || '/dashboard/orders' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Tapping the notification opens (or focuses) the orders dashboard.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard/orders'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
