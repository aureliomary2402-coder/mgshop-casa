"use client"
import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { subscribeToPush } from '@/lib/push-subscribe'

export function NotifyBanner() {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
    // Se il permesso è già stato negato dal browser, non ha senso
    // ripresentare il banner: il popup nativo non si aprirebbe comunque.
    if (Notification.permission === 'denied') return
    if (Notification.permission === 'granted') return

    navigator.serviceWorker.ready.then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      if (!sub) setVisible(true)
    }).catch(() => {})
  }, [])

  // Chiudere con la X nasconde il banner solo per questa visita:
  // al prossimo ingresso sul sito ricomparirà, finché non viene attivato.
  const dismiss = () => setVisible(false)

  const activate = async () => {
    setLoading(true)
    const result = await subscribeToPush()
    setLoading(false)
    if (result.ok) {
      setVisible(false)
    } else if (result.reason === 'permission-denied') {
      // Solo se il browser blocca definitivamente il permesso, smettiamo
      // di proporlo (ripresentarlo non servirebbe a nulla).
      setVisible(false)
    } else {
      setVisible(false)
    }
  }

  if (!visible) return null

  // Posizionato sopra la bottom nav, la bollicina del menu flottante e la
  // scorciatoia carrello (che su alcune pagine si impilano fino a ~13.5rem
  // da fondo pagina): senza questo margine il banner veniva parzialmente
  // coperto su mobile. z-index più alto di tutti gli altri elementi fissi
  // così resta sempre leggibile, ed essendo "fixed" resta visibile anche
  // scorrendo la pagina finché non viene chiuso o attivato.
  return (
    <div className="fixed left-4 right-4 z-[60] animate-slide-in-up" style={{ bottom: 'calc(262px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="neon-glow mx-auto flex max-w-sm items-center gap-3 rounded-[24px] border border-cyan-300/15 bg-[#071a22] p-3.5 shadow-2xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
          <Bell className="h-5 w-5 text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Non perderti le offerte!</p>
          <p className="text-xs text-slate-400">Attiva le notifiche per promozioni e novità.</p>
        </div>
        <button onClick={activate} disabled={loading}
          className="shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black transition-transform active:scale-95 disabled:opacity-60"
          style={{ background: '#22d3ee', color: '#05212a' }}>
          {loading ? '...' : 'Attiva'}
        </button>
        <button onClick={dismiss} className="shrink-0 p-1 text-slate-500 hover:text-slate-300">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
