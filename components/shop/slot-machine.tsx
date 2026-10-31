"use client"

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ACTIVE_POPUP_THEME, POPUP_THEMES } from '@/lib/popup-theme'
import { SLOT_SYMBOLS, SLOT_PRIZE_SYMBOLS } from '@/lib/slot-theme'

interface SpinResult { enabled: boolean; won: boolean; symbols: string[]; label: string | null; discount_percent: number }

// Slot mostrata dopo l'invio dell'ordine. Colori e simboli seguono il tema del
// sito (ACTIVE_POPUP_THEME): ora Halloween. L'esito arriva dal server.
export function SlotMachine({ orderId }: { orderId: string }) {
  const theme = POPUP_THEMES[ACTIVE_POPUP_THEME]
  const pool = SLOT_SYMBOLS[ACTIVE_POPUP_THEME]
  const rand = () => pool[Math.floor(Math.random() * pool.length)]

  const [enabled, setEnabled] = useState(false)
  const [open, setOpen] = useState(true)
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'done'>('ready')
  const [shown, setShown] = useState<string[]>(() => [pool[0], pool[1], pool[2]])
  const [locked, setLocked] = useState<boolean[]>([false, false, false])
  const [result, setResult] = useState<SpinResult | null>(null)
  const [error, setError] = useState('')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    fetch('/api/slot/spin', { cache: 'no-store' }).then(r => r.json()).then(d => setEnabled(!!d?.enabled)).catch(() => {})
    return () => timers.current.forEach(clearTimeout)
  }, [])

  // Rulli che girano finché non vengono bloccati uno alla volta
  useEffect(() => {
    if (phase !== 'spinning') return
    const iv = setInterval(() => {
      setShown(prev => prev.map((s, i) => (locked[i] && result ? result.symbols[i] : rand())))
    }, 90)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, locked, result])

  const spin = async () => {
    setError(''); setPhase('spinning'); setLocked([false, false, false])
    let data: SpinResult | null = null
    try {
      const res = await fetch('/api/slot/spin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId }) })
      data = await res.json().catch(() => null)
      if (!res.ok || !data?.enabled || !data.symbols) { setError((data as any)?.error || 'Non è stato possibile giocare. Riprova.'); setPhase('ready'); return }
    } catch { setError('Non è stato possibile giocare. Riprova.'); setPhase('ready'); return }
    setResult(data)
    ;[900, 1500, 2100].forEach((ms, i) => {
      timers.current.push(setTimeout(() => {
        setLocked(prev => prev.map((l, j) => (j === i ? true : l)))
        setShown(prev => prev.map((s, j) => (j === i ? data!.symbols[i] : s)))
        if (i === 2) timers.current.push(setTimeout(() => setPhase('done'), 450))
      }, ms))
    })
  }

  if (!enabled || !open) return null

  // Portale su <body>: cosi il popup resta fisso sullo schermo anche se un
  // contenitore genitore ha animazioni/transform (che lo spostavano in cima pagina).
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: theme.backdrop }}>
      <div className="relative w-full max-w-sm rounded-3xl px-5 pt-10 pb-6 text-center" style={{ background: theme.cardBg, border: theme.border, boxShadow: theme.glow }}>
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-5xl leading-none">{theme.badge}</div>
        <button onClick={() => setOpen(false)} aria-label="Chiudi" className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: theme.closeBg, color: theme.closeColor }}>
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-2xl font-black mb-1" style={{ color: theme.title }}>
          {phase === 'done' ? (result?.won ? '🎉 Hai vinto!' : 'Ci sei quasi!') : '🎰 Gira la slot!'}
        </h3>
        <p className="text-sm mb-5" style={{ color: theme.text }}>
          {phase === 'done'
            ? (result?.won
              ? `${result.label || `Sconto ${result.discount_percent}%`}: lo sconto del ${result.discount_percent}% si applica in automatico sul tuo prossimo ordine (con lo stesso numero di telefono).`
              : 'Stavolta niente premio. Riprova con il prossimo ordine!')
            : 'Tre simboli uguali = sconto sul tuo prossimo ordine.'}
        </p>

        <div className="flex justify-center gap-2 mb-5">
          {shown.map((s, i) => (
            <div key={i} className="w-20 h-24 rounded-2xl flex items-center justify-center text-5xl"
              style={{ background: 'rgba(255,255,255,0.08)', border: theme.border, transform: phase === 'spinning' && !locked[i] ? 'translateY(-2px)' : undefined, filter: phase === 'spinning' && !locked[i] ? 'blur(1.2px)' : undefined }}>
              {s}
            </div>
          ))}
        </div>

        <div className="mb-5 space-y-1 text-sm font-semibold" style={{ color: theme.text }}>
          {Object.entries(SLOT_PRIZE_SYMBOLS[ACTIVE_POPUP_THEME]).map(([pct, sym]) => (
            <p key={pct}><span className="text-xl align-middle mr-1.5">{sym}</span>sconto del {pct}%</p>
          ))}
        </div>

        {error && <p className="text-sm mb-3" style={{ color: '#ff9a9a' }}>{error}</p>}

        {phase === 'done' ? (
          <button onClick={() => setOpen(false)} className="w-full font-bold py-3.5 rounded-2xl" style={{ background: theme.buttonBg, color: theme.buttonText, boxShadow: theme.buttonGlow }}>
            {result?.won ? 'Fantastico!' : 'Chiudi'}
          </button>
        ) : (
          <button onClick={spin} disabled={phase === 'spinning'} className="w-full font-bold py-3.5 rounded-2xl disabled:opacity-70" style={{ background: theme.buttonBg, color: theme.buttonText, boxShadow: theme.buttonGlow }}>
            {phase === 'spinning' ? 'Si gira…' : 'GIRA! 🎰'}
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}
