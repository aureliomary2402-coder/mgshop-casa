"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Home, Store, Tag, Newspaper, Ticket, UserRound } from 'lucide-react'
import { useUIPanelsStore } from '@/lib/ui-panels-store'

// Barra di navigazione inferiore, sempre visibile su mobile. Da desktop
// invece resta visibile solo sulle pagine senza una nav propria in alto
// (Lotteria/Promo/Volantino/Zone di consegna): su Home/Negozio/Prodotto/
// Preferiti/Carrello l'header ha già Negozio/Promo/Volantino/Lotteria/
// Account, quindi la tab in basso sparirebbe duplicando la stessa nav.
// Usa solo route già esistenti: "Account" apre lo stesso pannello punti
// già presente nel FloatingMenu, senza creare una pagina nuova.
// "Volantino" compare solo quando il volantino è attivo (stessa logica
// dell'header desktop).
const HEADERLESS_DESKTOP_PATHS = ['/lotteria', '/promo', '/volantino', '/consegne']

const BASE_ITEMS = [
  { key: 'home', href: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  { key: 'shop', href: '/shop', label: 'Negozio', icon: Store, match: (p: string) => p.startsWith('/shop') || p.startsWith('/prodotto') },
  { key: 'promo', href: '/promo', label: 'Promo', icon: Tag, match: (p: string) => p.startsWith('/promo') },
] as const

const VOLANTINO_ITEM = { key: 'volantino', href: '/volantino', label: 'Volantino', icon: Newspaper, match: (p: string) => p.startsWith('/volantino') } as const

const TAIL_ITEMS = [
  { key: 'lotteria', href: '/lotteria', label: 'Lotteria', icon: Ticket, match: (p: string) => p.startsWith('/lotteria') },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const openPoints = useUIPanelsStore(s => s.openPoints)
  const [volantinoActive, setVolantinoActive] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/volantino').then(r => r.json()).then(d => setVolantinoActive(d?.is_active === true)).catch(() => {})
  }, [])

  if (pathname?.startsWith('/mgadmin-panel')) return null

  const showOnDesktop = HEADERLESS_DESKTOP_PATHS.some(p => pathname?.startsWith(p))
  const linkItems = [...BASE_ITEMS, ...(volantinoActive ? [VOLANTINO_ITEM] : []), ...TAIL_ITEMS]
  const totalCols = linkItems.length + 1 // + Account
  const activeIndex = (() => {
    const idx = linkItems.findIndex(item => item.match(pathname || ''))
    return idx === -1 ? -1 : idx
  })()

  const pillStyle = activeIndex >= 0
    ? { left: `calc(${(activeIndex / totalCols) * 100}% + 4px)`, width: `calc(${100 / totalCols}% - 8px)`, opacity: 1 }
    : { left: `calc(${(linkItems.length / totalCols) * 100}% + 4px)`, width: `calc(${100 / totalCols}% - 8px)`, opacity: 0 }

  return (
    <nav
      className={`fixed inset-x-0 z-40 ${showOnDesktop ? '' : 'lg:hidden'}`}
      style={{ bottom: 'calc(36px + env(safe-area-inset-bottom, 0px))' }}
      aria-label="Navigazione principale"
    >
      <div className="mx-3 mb-2 md:max-w-md md:mx-auto rounded-2xl overflow-hidden liquid-glass-nav">
        <div ref={trackRef} className="relative grid items-stretch" style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}>
          <div className="liquid-glass-pill" style={pillStyle} />

          {linkItems.map(item => {
            const active = item.match(pathname || '')
            const Icon = item.icon
            return (
              <Link key={item.key} href={item.href}
                className="relative z-[1] flex flex-col items-center justify-center gap-0.5 py-2.5 btn-press transition-colors"
                style={{ color: active ? '#0891b2' : '#5b7c85' }}>
                <Icon className="w-5 h-5" style={active ? { filter: 'drop-shadow(0 0 6px rgba(8,145,178,0.4))' } : undefined} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            )
          })}

          <button
            onClick={openPoints}
            className="relative z-[1] flex flex-col items-center justify-center gap-0.5 py-2.5 btn-press transition-colors"
            style={{ color: '#5b7c85' }}>
            <UserRound className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">Account</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
