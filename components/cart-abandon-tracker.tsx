"use client"
import { useEffect, useRef } from 'react'
import { useCartStore } from '@/lib/cart-store'

function getSessionId() {
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

// Tiene traccia del carrello e, quando l'utente chiude la scheda o cambia
// pagina/app lasciando articoli dentro, invia una segnalazione al server
// tramite sendBeacon (funziona anche se la pagina si sta chiudendo, a
// differenza di una normale fetch che verrebbe interrotta).
export function CartAbandonTracker() {
  const items = useCartStore(s => s.items)
  const getTotalPrice = useCartStore(s => s.getTotalPrice)
  const itemsRef = useRef(items)
  const totalRef = useRef(0)

  useEffect(() => {
    itemsRef.current = items
    totalRef.current = getTotalPrice()
  }, [items, getTotalPrice])

  useEffect(() => {
    const sendSignal = () => {
      const currentItems = itemsRef.current
      if (!currentItems || currentItems.length === 0) return
      const sessionId = getSessionId()
      if (!sessionId) return
      const payload = JSON.stringify({
        sessionId,
        items: currentItems.map(i => ({ name: i.product.name, quantity: i.quantity, price: i.unitPrice ?? i.product.price })),
        total: totalRef.current,
        // Se l'utente ha già scritto il numero nel checkout (salvato a parte
        // in sessionStorage dal form del carrello) lo includiamo, così
        // l'admin può ricontattarlo anche se non ha completato l'ordine.
        phone: (() => { try { return sessionStorage.getItem('mgshop-checkout-phone') || '' } catch { return '' } })(),
      })
      try {
        navigator.sendBeacon('/api/analytics/cart-abandon', new Blob([payload], { type: 'application/json' }))
      } catch { /* ignora: siamo comunque in fase di chiusura pagina */ }
    }

    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') sendSignal() }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', sendSignal)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', sendSignal)
    }
  }, [])

  return null
}
