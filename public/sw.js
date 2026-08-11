// Attivazione immediata: non serve una cache offline dedicata (il sito è
// quasi tutto dinamico), ma un service worker registrato con un listener
// "fetch" è uno dei requisiti che i browser controllano prima di proporre
// "Aggiungi a schermata Home". Qui ci limitiamo a lasciar passare le
// richieste così come sono, senza introdurre cache che rischierebbero di
// mostrare prezzi o disponibilità non aggiornati.
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})

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
