"use client"
import { useEffect, useRef } from 'react'
import { useWishlistStore } from '@/lib/wishlist-store'
import { getDeviceId } from '@/lib/device-id'

// Segnala al server ogni volta che cambiano i preferiti del cliente, così
// l'admin può vederli nel pannello. Usiamo l'id del DISPOSITIVO (non il
// session id della singola visita) perché i preferiti restano salvati nel
// tempo: se il cliente li modifica giorni dopo in una nuova visita, deve
// comunque aggiornare la stessa riga, non crearne una nuova orfana.
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
        body: JSON.stringify({ deviceId: getDeviceId(), productIds: ids }),
      }).catch(() => {})
    }, 1500)
    return () => clearTimeout(timeout)
  }, [ids])

  return null
}
