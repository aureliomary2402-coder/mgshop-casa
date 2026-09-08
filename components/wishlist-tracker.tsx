"use client"
import { useEffect, useRef } from 'react'
import { useWishlistStore } from '@/lib/wishlist-store'
import { getSessionId } from '@/lib/session-id'

// Segnala al server ogni volta che cambiano i preferiti del cliente, così
// l'admin può vederli nel pannello (stesso meccanismo dei carrelli
// abbandonati: un record per sessione del browser).
export function WishlistTracker() {
  const ids = useWishlistStore(s => s.ids)
  const lastSent = useRef<string>('')

  useEffect(() => {
    const key = [...ids].sort().join(',')
    if (key === lastSent.current) return
    lastSent.current = key

    // Piccolo ritardo per non inviare una richiesta a ogni singolo click se
    // il cliente aggiunge/toglie più prodotti in rapida successione.
    const timeout = setTimeout(() => {
      fetch('/api/analytics/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: getSessionId(), productIds: ids }),
      }).catch(() => {})
    }, 1500)
    return () => clearTimeout(timeout)
  }, [ids])

  return null
}
