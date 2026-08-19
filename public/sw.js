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
    // Se chi invia la notifica ha caricato un'immagine, sostituisce il logo
    // di default (icon-192.png) come icona della notifica.
    icon: data.imageUrl || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    // Le notifiche admin (nuovo ordine, chat...) passano sempre una url
    // esplicita. Per le notifiche ai clienti, se chi invia non ha scelto
    // un link, il default e' la home invece del pannello admin.
    data: { url: data.url || '/', notificationId: data.notificationId || null },
    actions: [
      { action: 'open', title: 'Apri' },
      { action: 'close', title: 'Chiudi' }
    ]
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  var notificationId = event.notification.data && event.notification.data.notificationId
  var targetUrl = (event.notification.data && event.notification.data.url) || '/mgadmin-panel'

  var tasks = []
  if (notificationId) {
    tasks.push(
      fetch('/api/push/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notificationId }),
      }).catch(function () {})
    )
  }
  if (event.action === 'open' || !event.action) {
    tasks.push(clients.openWindow(targetUrl))
  }
  event.waitUntil(Promise.all(tasks))
})
