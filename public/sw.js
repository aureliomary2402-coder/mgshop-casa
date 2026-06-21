self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'MGShop Casa'
  const options = {
    body: data.body || 'Nuovo ordine ricevuto!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/mgadmin-panel' },
    actions: [
      { action: 'open', title: 'Vedi ordine' },
      { action: 'close', title: 'Chiudi' }
    ]
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data.url || '/mgadmin-panel'))
  }
})
