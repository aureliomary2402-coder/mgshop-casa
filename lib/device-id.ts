// A differenza del session id (legato alla singola visita/scheda del
// browser, si azzera quando la chiudi), questo identificativo resta lo
// stesso per sempre su questo dispositivo/browser — esattamente come i
// preferiti stessi, che sono salvati con lo stesso meccanismo (localStorage).
// Serve per collegare sempre le modifiche ai preferiti alla stessa "scheda"
// nel pannello admin, anche se il cliente torna sul sito giorni dopo.
export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem('mgshop-device-id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('mgshop-device-id', id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}
