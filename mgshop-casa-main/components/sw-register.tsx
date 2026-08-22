"use client"

import { useEffect } from 'react'

// Registra il service worker su tutto il sito (non solo nel pannello
// admin, dove serviva già per le notifiche push). Un service worker
// registrato è uno dei requisiti che Chrome/Android controllano prima di
// proporre "Aggiungi a schermata Home": senza questo, il manifest da solo
// non basta a rendere il sito installabile come app.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
