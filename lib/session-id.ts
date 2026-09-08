// Session id del browser: lo stesso identificativo usato per tracciare i
// carrelli abbandonati (CartAbandonTracker) e ora anche per collegare le
// iscrizioni alle notifiche push a quella sessione, così se un cliente
// abbandona il carrello ma ha le notifiche attive possiamo ricontattarlo
// anche senza avere il suo numero di telefono.
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = sessionStorage.getItem('mgshop-session-id')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('mgshop-session-id', id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}
