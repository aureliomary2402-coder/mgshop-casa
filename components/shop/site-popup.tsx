"use client"

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { ACTIVE_POPUP_THEME, POPUP_THEMES, type PopupThemeName } from '@/lib/popup-theme'

export interface SitePopupData {
  id: string
  title: string
  message: string
  button_label?: string | null
  button_link?: string | null
  frequency: 'session' | 'once'
  updated_at?: string | null
}

const CSS = `
@keyframes sp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sp-pop { from { opacity: 0; transform: translateY(14px) scale(.94); } to { opacity: 1; transform: none; } }
.sp-backdrop { animation: sp-fade .25s ease-out both; }
.sp-card { animation: sp-pop .32s cubic-bezier(.2,.9,.3,1.2) both; }
@media (prefers-reduced-motion: reduce) { .sp-backdrop, .sp-card { animation: none; } }
`

const WEB = '#9d7fe0'

// Decorazioni FISSE (nessuna animazione continua), coerenti con HalloweenDecor.
function HalloweenCardDecor() {
  return (
    <>
      <svg width="120" height="120" viewBox="0 0 150 150" aria-hidden="true"
        style={{ position: 'absolute', top: 0, left: 0, opacity: 0.7, pointerEvents: 'none' }}>
        <g fill="none" stroke={WEB} strokeWidth="1.6" strokeLinecap="round">
          <path d="M0 0 L150 0 M0 0 L0 150 M0 0 L120 120 M0 0 L135 55 M0 0 L55 135" />
          <path d="M30 0 Q22 22 0 30 M60 0 Q45 45 0 60 M95 0 Q70 70 0 95 M130 0 Q95 95 0 130" />
        </g>
      </svg>
      {[
        { size: 34, style: { bottom: 14, right: 16, transform: 'rotate(-10deg)' } },
        { size: 24, style: { bottom: 40, left: 18, transform: 'rotate(8deg)' } },
      ].map((b, i) => (
        <svg key={i} width={b.size} height={b.size / 2} viewBox="0 0 64 32" aria-hidden="true"
          style={{ position: 'absolute', pointerEvents: 'none', ...b.style }}>
          <path
            d="M32 10 C30 6 28 4 27 2 C26 6 25 8 22 9 C17 6 9 5 0 9 C6 11 8 15 8 21 C12 17 17 16 21 18 C23 22 27 25 32 30 C37 25 41 22 43 18 C47 16 52 17 56 21 C56 15 58 11 64 9 C55 5 47 6 42 9 C39 8 38 6 37 2 C36 4 34 6 32 10 Z"
            fill="#1a0933" stroke="#a78bfa" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      ))}
    </>
  )
}

function BubblesCardDecor() {
  const bubbles = [
    { s: 46, top: -12, left: -10 }, { s: 22, top: 30, left: 52 },
    { s: 34, bottom: -10, right: 20 }, { s: 16, bottom: 36, right: 64 },
  ]
  return (
    <>
      {bubbles.map((b, i) => (
        <div key={i} aria-hidden="true" style={{
          position: 'absolute', width: b.s, height: b.s, borderRadius: '50%', pointerEvents: 'none',
          top: b.top, left: b.left, bottom: b.bottom, right: b.right,
          background: 'radial-gradient(circle at 30% 26%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.7) 16%, rgba(224,247,250,0.45) 40%, rgba(103,212,231,0.28) 70%, transparent 100%)',
          border: '1px solid rgba(255,255,255,0.8)',
        }} />
      ))}
    </>
  )
}

// Solo grafica: usata sia dal sito sia dall'anteprima nel pannello admin.
export function SitePopupView({ popup, onClose, theme = ACTIVE_POPUP_THEME }: {
  popup: Pick<SitePopupData, 'title' | 'message' | 'button_label' | 'button_link'>
  onClose: () => void
  theme?: PopupThemeName
}) {
  const t = POPUP_THEMES[theme]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const link = (popup.button_link || '').trim()
  const external = /^https?:\/\//i.test(link)

  return (
    <div
      className="sp-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto"
      style={{
        background: t.backdrop,
        padding: 'max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom))',
      }}
      onClick={onClose}
    >
      <style>{CSS}</style>
      <div
        role="dialog" aria-modal="true" aria-label={popup.title || 'Messaggio'}
        className="sp-card relative my-auto w-full max-w-sm"
        style={{ marginTop: 'auto', marginBottom: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative overflow-hidden rounded-[28px]" style={{ background: t.cardBg, border: t.border, boxShadow: t.glow }}>
          {t.decor === 'halloween' ? <HalloweenCardDecor /> : <BubblesCardDecor />}
          <div className="relative px-6 pb-6 pt-12 text-center">
            {popup.title && (
              <h2 className="text-xl font-black leading-tight" style={{ color: t.title }}>{popup.title}</h2>
            )}
            {popup.message && (
              <p className="whitespace-pre-line text-[15px] leading-relaxed" style={{ color: t.text, marginTop: popup.title ? 10 : 0 }}>
                {popup.message}
              </p>
            )}
            {popup.button_label && link && (
              <a
                href={link}
                onClick={onClose}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl px-5 text-base font-black"
                style={{ background: t.buttonBg, color: t.buttonText, boxShadow: t.buttonGlow }}
              >
                {popup.button_label}
              </a>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute left-1/2 -top-7 -translate-x-1/2 text-5xl leading-none" aria-hidden="true"
          style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))' }}>
          {t.badge}
        </div>
        <button
          onClick={onClose} aria-label="Chiudi"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: t.closeBg, color: t.closeColor }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

// Un pop up già chiuso viene ricordato; se l'admin lo modifica (updated_at cambia)
// ricompare a chi l'aveva chiuso.
function dismissKey(p: SitePopupData) {
  return `mgshop_popup_${p.id}_${p.updated_at ?? ''}`
}
function storeFor(p: SitePopupData) {
  return p.frequency === 'once' ? window.localStorage : window.sessionStorage
}
function wasDismissed(p: SitePopupData) {
  try { return storeFor(p).getItem(dismissKey(p)) === '1' } catch { return false }
}

export function SitePopup() {
  const pathname = usePathname()
  const [queue, setQueue] = useState<SitePopupData[]>([])
  const [current, setCurrent] = useState<SitePopupData | null>(null)

  // Si carica una volta sola: il layout resta montato tra le pagine.
  useEffect(() => {
    let timer: number | undefined
    fetch('/api/popups', { cache: 'no-store' })
      .then(r => r.json())
      .then((list: SitePopupData[]) => {
        if (!Array.isArray(list)) return
        const pending = list.filter(p => !wasDismissed(p))
        if (pending.length === 0) return
        // Piccolo ritardo: prima si vede il sito, poi arriva il messaggio.
        timer = window.setTimeout(() => {
          setCurrent(pending[0])
          setQueue(pending.slice(1))
        }, 1200)
      })
      .catch(() => {})
    return () => { if (timer) window.clearTimeout(timer) }
  }, [])

  const close = useCallback(() => {
    setCurrent(prev => {
      if (prev) { try { storeFor(prev).setItem(dismissKey(prev), '1') } catch {} }
      return null
    })
    // Se ce n'è un altro attivo, compare subito dopo.
    window.setTimeout(() => {
      setQueue(q => {
        if (q.length > 0) setCurrent(q[0])
        return q.slice(1)
      })
    }, 350)
  }, [])

  if (pathname?.startsWith('/mgadmin-panel')) return null
  if (!current) return null
  return <SitePopupView popup={current} onClose={close} />
}
