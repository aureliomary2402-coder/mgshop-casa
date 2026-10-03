"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Home, Store, Tag, Newspaper, Ticket, UserRound } from 'lucide-react'
import { useUIPanelsStore } from '@/lib/ui-panels-store'

// Barra di navigazione inferiore, sempre visibile su mobile. Da desktop
// il GlobalHeader ha già tutti i link (Home/Negozio/Promo/Volantino/
// Lotteria/Consegne/Contatti/Account), quindi qui resta sempre nascosta
// su desktop, su tutte le pagine.
// Usa solo route già esistenti: "Account" apre lo stesso pannello punti
// già presente nel FloatingMenu, senza creare una pagina nuova.
// "Volantino" compare solo quando il volantino è attivo (stessa logica
// dell'header desktop).
//
// Effetto "camaleonte": la barra guarda di che colore è la pagina proprio
// sotto di lei e passa da scura (sopra le sezioni scure, es. la hero) a
// chiara (sopra le sezioni chiare, es. la griglia dei prodotti).
const BASE_ITEMS = [
  { key: 'home', href: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  { key: 'shop', href: '/shop', label: 'Negozio', icon: Store, match: (p: string) => p.startsWith('/shop') || p.startsWith('/prodotto') },
  { key: 'promo', href: '/promo', label: 'Promo', icon: Tag, match: (p: string) => p.startsWith('/promo') },
] as const

const VOLANTINO_ITEM = { key: 'volantino', href: '/volantino', label: 'Volantino', icon: Newspaper, match: (p: string) => p.startsWith('/volantino') } as const

const TAIL_ITEMS = [
  { key: 'lotteria', href: '/lotteria', label: 'Lotteria', icon: Ticket, match: (p: string) => p.startsWith('/lotteria') },
] as const

type Tone = 'dark' | 'light'
type RGBA = { r: number; g: number; b: number; a: number }

const TONES = {
  dark: {
    box: {
      background: 'rgba(6, 21, 28, 0.84)',
      border: '1px solid rgba(103, 232, 249, 0.2)',
      boxShadow: '0 20px 60px rgba(6, 21, 28, 0.38), 0 0 40px rgba(34, 211, 238, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.10)',
    },
    pill: {
      background: 'rgba(34, 211, 238, 0.14)',
      border: '1px solid rgba(103, 232, 249, 0.28)',
      boxShadow: '0 0 28px rgba(34, 211, 238, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.10)',
    },
    idle: '#94a3b8', active: '#67e8f9', activeLabel: '#ffffff', glow: 'drop-shadow(0 0 8px rgba(34,211,238,0.55))',
  },
  light: {
    box: {
      background: 'rgba(255, 255, 255, 0.88)',
      border: '1px solid rgba(8, 145, 178, 0.22)',
      boxShadow: '0 20px 50px rgba(15, 23, 42, 0.16), 0 0 30px rgba(34, 211, 238, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
    },
    pill: {
      background: 'rgba(34, 211, 238, 0.20)',
      border: '1px solid rgba(8, 145, 178, 0.30)',
      boxShadow: '0 6px 18px rgba(8, 145, 178, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
    },
    idle: '#64748b', active: '#0e7490', activeLabel: '#083344', glow: 'drop-shadow(0 0 6px rgba(8,145,178,0.25))',
  },
} as const

// ---- lettura del colore della pagina sotto la barra ----

let colorCtx: CanvasRenderingContext2D | null | undefined
const colorCache = new Map<string, RGBA | null>()

// Converte qualunque colore CSS (rgb, oklch, color(), hex...) in rgba sRGB
// passando da un canvas 1x1: così funziona anche con i colori moderni.
function parseColor(str: string): RGBA | null {
  if (!str || str === 'transparent') return null
  if (colorCache.has(str)) return colorCache.get(str) ?? null
  if (colorCtx === undefined) {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    colorCtx = c.getContext('2d', { willReadFrequently: true })
  }
  let out: RGBA | null = null
  if (colorCtx) {
    colorCtx.clearRect(0, 0, 1, 1)
    colorCtx.fillStyle = 'rgba(0,0,0,0)'
    colorCtx.fillStyle = str
    colorCtx.fillRect(0, 0, 1, 1)
    const d = colorCtx.getImageData(0, 0, 1, 1).data
    if (d[3] > 0) out = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }
  }
  colorCache.set(str, out)
  return out
}

// Colore medio di un gradiente (ignora le immagini vere e proprie).
function gradientColor(image: string): RGBA | null {
  if (!image || image === 'none' || !image.includes('gradient')) return null
  const tokens = image.match(/rgba?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|color\([^)]*\)|#[0-9a-fA-F]{3,8}\b|transparent/g)
  if (!tokens || tokens.length === 0) return null
  let r = 0, g = 0, b = 0, aSum = 0
  for (const t of tokens) {
    const c = parseColor(t)
    if (c) { r += c.r * c.a; g += c.g * c.a; b += c.b * c.a; aSum += c.a }
  }
  if (aSum < 0.05) return null
  return { r: r / aSum, g: g / aSum, b: b / aSum, a: Math.min(1, aSum / tokens.length) }
}

// Luminosità (0 = nero, 1 = bianco) di ciò che sta dietro un punto dello schermo.
function luminanceAt(x: number, y: number, nav: HTMLElement): number {
  let accR = 0, accG = 0, accB = 0, accA = 0
  const add = (c: RGBA | null) => {
    if (!c || accA >= 0.98) return
    const w = (1 - accA) * c.a
    accR += w * c.r; accG += w * c.g; accB += w * c.b; accA += w
  }
  for (const el of document.elementsFromPoint(x, y)) {
    if (nav.contains(el)) continue
    const cs = getComputedStyle(el)
    // I pannelli fissi (ticker, pulsanti flottanti, menu) non sono lo sfondo della pagina.
    if (cs.position === 'fixed') continue
    add(gradientColor(cs.backgroundImage))
    add(parseColor(cs.backgroundColor))
    if (accA >= 0.98) break
  }
  // Quello che resta scoperto è lo sfondo bianco della pagina.
  const rest = 1 - accA
  const r = accR + rest * 255, g = accG + rest * 255, b = accB + rest * 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export function BottomNav() {
  const pathname = usePathname()
  const openPoints = useUIPanelsStore(s => s.openPoints)
  const [volantinoActive, setVolantinoActive] = useState(false)
  const [tone, setTone] = useState<Tone>('dark')
  const trackRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    fetch('/api/volantino').then(r => r.json()).then(d => setVolantinoActive(Array.isArray(d) && d.length > 0)).catch(() => {})
  }, [])

  const detect = useCallback(() => {
    const box = boxRef.current
    const nav = navRef.current
    if (!box || !nav) return
    const rect = box.getBoundingClientRect()
    if (rect.width === 0) return
    const y = rect.top + rect.height / 2
    const xs = [0.1, 0.3, 0.5, 0.7, 0.9].map(f => rect.left + rect.width * f)
    const lum = xs.reduce((sum, x) => sum + luminanceAt(x, y, nav), 0) / xs.length
    // Due soglie diverse per non farla "sfarfallare" quando il colore è intermedio.
    setTone(prev => (prev === 'dark' ? (lum > 0.6 ? 'light' : 'dark') : (lum < 0.45 ? 'dark' : 'light')))
  }, [])

  useEffect(() => {
    let raf = 0
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; detect() })
    }
    detect()
    window.addEventListener('scroll', schedule, { passive: true, capture: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', schedule)
    // Rete di sicurezza: contenuti che si caricano dopo o animazioni senza scroll.
    const interval = window.setInterval(schedule, 800)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('orientationchange', schedule)
      window.clearInterval(interval)
    }
  }, [detect])

  // Cambio pagina: rileggi subito e un attimo dopo, quando il nuovo contenuto è comparso.
  useEffect(() => {
    detect()
    const t1 = window.setTimeout(detect, 250)
    const t2 = window.setTimeout(detect, 900)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [pathname, detect])

  if (pathname?.startsWith('/mgadmin-panel')) return null

  const linkItems = [...BASE_ITEMS, ...(volantinoActive ? [VOLANTINO_ITEM] : []), ...TAIL_ITEMS]
  const totalCols = linkItems.length + 1 // + Account
  const activeIndex = (() => {
    const idx = linkItems.findIndex(item => item.match(pathname || ''))
    return idx === -1 ? -1 : idx
  })()

  const T = TONES[tone]
  const pillPos = activeIndex >= 0
    ? { left: `calc(${(activeIndex / totalCols) * 100}% + 4px)`, width: `calc(${100 / totalCols}% - 8px)`, opacity: 1 }
    : { left: `calc(${(linkItems.length / totalCols) * 100}% + 4px)`, width: `calc(${100 / totalCols}% - 8px)`, opacity: 0 }
  const pillStyle = {
    ...pillPos,
    ...T.pill,
    transition: 'left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease, background-color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
  }

  return (
    <nav
      ref={navRef}
      className="fixed inset-x-0 z-[45] lg:hidden"
      style={{ bottom: 'calc(36px + env(safe-area-inset-bottom, 0px))' }}
      aria-label="Navigazione principale"
    >
      <div ref={boxRef} className="mx-3 mb-2 md:max-w-md md:mx-auto rounded-[26px] overflow-hidden mg-nav-dark"
        style={{ ...T.box, transition: 'background-color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease' }}>
        <div ref={trackRef} className="relative grid items-stretch" style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}>
          <div className="mg-nav-pill" style={pillStyle} />

          {linkItems.map(item => {
            const active = item.match(pathname || '')
            const Icon = item.icon
            return (
              <Link key={item.key} href={item.href}
                className="relative z-[1] flex flex-col items-center justify-center gap-0.5 py-2.5 btn-press transition-colors"
                style={{ color: active ? T.active : T.idle }}>
                <Icon className="w-5 h-5" style={active ? { filter: T.glow } : undefined} />
                <span className="text-[10px] font-bold leading-none" style={active ? { color: T.activeLabel } : undefined}>{item.label}</span>
              </Link>
            )
          })}

          <button
            onClick={openPoints}
            className="relative z-[1] flex flex-col items-center justify-center gap-0.5 py-2.5 btn-press transition-colors"
            style={{ color: T.idle }}>
            <UserRound className="w-5 h-5" />
            <span className="text-[10px] font-bold leading-none">Account</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
