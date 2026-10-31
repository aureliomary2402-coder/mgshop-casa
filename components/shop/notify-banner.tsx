"use client"
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, X, Share, PlusSquare, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { subscribeToPush } from '@/lib/push-subscribe'

// Chiave che ricorda se il popup di benvenuto è già stato mostrato a questo
// visitatore: il popup grande compare una sola volta (nuovo utente), poi
// resta il banner piccolo in basso nelle visite successive, come prima.
const SEEN_KEY = 'mgshop-notify-popup-seen'

type Kind = 'push' | 'ios' | null
type View = 'modal' | 'banner' | null

export function NotifyBanner() {
  const pathname = usePathname()
  const [kind, setKind] = useState<Kind>(null)
  const [view, setView] = useState<View>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    const seen = (() => { try { return !!localStorage.getItem(SEEN_KEY) } catch { return false } })()
    const showModalSoon = () => { timer = setTimeout(() => { if (!cancelled) setView('modal') }, 2500) }

    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

    if (pushSupported) {
      // Permesso già negato o già concesso: niente da proporre.
      if (Notification.permission === 'denied' || Notification.permission === 'granted') return
      navigator.serviceWorker.ready.then(async reg => {
        const sub = await reg.pushManager.getSubscription()
        if (cancelled || sub) return
        setKind('push')
        if (seen) setView('banner')
        else showModalSoon()
      }).catch(() => {})
    } else if (isIOS && !standalone) {
      // Su iPhone/iPad le notifiche web esistono solo se il sito è stato
      // aggiunto alla schermata Home: da Safari normale PushManager non
      // c'è, per questo prima il banner non compariva mai da telefono.
      if (!seen) {
        setKind('ios')
        showModalSoon()
      }
    }

    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [])

  const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1') } catch {} }

  // Chiudere nasconde il popup/banner solo per questa visita; il popup
  // grande non ricompare più, il banner piccolo sì finché non si attiva.
  const dismiss = () => { markSeen(); setView(null) }

  const activate = async () => {
    setLoading(true)
    const result = await subscribeToPush()
    setLoading(false)
    markSeen()
    setView(null)
    if (result.ok) toast.success('Notifiche attivate!')
    else if (result.reason !== 'permission-denied') toast.error('Non è stato possibile attivare le notifiche')
  }

  useEffect(() => {
    if (view !== 'modal') return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  // Nessun popup nel pannello admin.
  if (pathname?.startsWith('/mgadmin-panel') || pathname?.startsWith('/admin')) return null
  if (!view || !kind) return null

  if (view === 'modal') {
    return (
      <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={dismiss}>
        <div role="dialog" aria-modal="true"
          onClick={e => e.stopPropagation()}
          className="neon-glow animate-slide-in-up relative w-full max-w-sm rounded-[28px] border border-zucca-300/15 bg-[color:var(--c-160b29)] p-6 text-center shadow-2xl"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <button onClick={dismiss} aria-label="Chiudi" className="absolute right-3 top-3 p-1 text-slate-500 hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-zucca-300/20 bg-zucca-300/10">
            {kind === 'ios' ? <Smartphone className="h-7 w-7 text-zucca-300" /> : <Bell className="h-7 w-7 text-zucca-300" />}
          </div>

          {kind === 'push' ? (
            <>
              <p className="text-lg font-black text-white">Non perderti le offerte!</p>
              <p className="mt-2 text-sm text-slate-400">Attiva le notifiche: ti avvisiamo su promozioni, volantino e novità del negozio.</p>
              <button onClick={activate} disabled={loading}
                className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-black transition-transform active:scale-95 disabled:opacity-60"
                style={{ background: 'var(--c-ff9a3d)', color: 'var(--c-1a0d33)' }}>
                {loading ? '...' : 'Attiva le notifiche'}
              </button>
              <button onClick={dismiss} className="mt-3 w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-300">Non ora</button>
            </>
          ) : (
            <>
              <p className="text-lg font-black text-white">Ricevi le offerte sul tuo iPhone</p>
              <p className="mt-2 text-sm text-slate-400">Su iPhone le notifiche si attivano dopo aver aggiunto MGShop alla schermata Home:</p>
              <ol className="mt-4 space-y-3 text-left text-sm text-slate-300">
                <li className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zucca-300/10"><Share className="h-4 w-4 text-zucca-300" /></span>
                  <span>Tocca <b className="text-white">Condividi</b> in Safari</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zucca-300/10"><PlusSquare className="h-4 w-4 text-zucca-300" /></span>
                  <span>Scegli <b className="text-white">Aggiungi alla schermata Home</b></span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zucca-300/10"><Bell className="h-4 w-4 text-zucca-300" /></span>
                  <span>Apri MGShop dall'icona e tocca <b className="text-white">Attiva</b></span>
                </li>
              </ol>
              <button onClick={dismiss}
                className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-black transition-transform active:scale-95"
                style={{ background: 'var(--c-ff9a3d)', color: 'var(--c-1a0d33)' }}>
                Ho capito
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // Banner piccolo (visite successive, solo dove le notifiche sono supportate).
  // Posizionato sopra la bottom nav, la bollicina del menu flottante e la
  // scorciatoia carrello; z-index più alto degli altri elementi fissi.
  return (
    <div className="fixed left-4 right-4 z-[60] animate-slide-in-up" style={{ bottom: 'calc(262px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="neon-glow mx-auto flex max-w-sm items-center gap-3 rounded-[24px] border border-zucca-300/15 bg-[color:var(--c-160b29)] p-3.5 shadow-2xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zucca-300/20 bg-zucca-300/10">
          <Bell className="h-5 w-5 text-zucca-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Non perderti le offerte!</p>
          <p className="text-xs text-slate-400">Attiva le notifiche per promozioni e novità.</p>
        </div>
        <button onClick={activate} disabled={loading}
          className="shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black transition-transform active:scale-95 disabled:opacity-60"
          style={{ background: 'var(--c-ff9a3d)', color: 'var(--c-1a0d33)' }}>
          {loading ? '...' : 'Attiva'}
        </button>
        <button onClick={dismiss} className="shrink-0 p-1 text-slate-500 hover:text-slate-300">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
