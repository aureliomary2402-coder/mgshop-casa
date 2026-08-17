self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'mgshop-casa', body: event.data.text() };
  }

  const { title, body, url } = payload;

  event.waitUntil(
    self.registration.showNotification(title || 'mgshop-casa', {
      body: body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: { url: url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
