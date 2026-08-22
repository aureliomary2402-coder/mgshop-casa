"use client"

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, ShoppingBag, User } from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/lib/cart-store'
import { useUIPanelsStore } from '@/lib/ui-panels-store'

// Voci di navigazione nell'ordine mostrato nell'immagine di riferimento.
// Solo route reali; le 3 senza pagina propria (Promo Box, Punti, Contatti)
// riusano funzionalità già esistenti (pannelli del FloatingMenu) invece di
// puntare a pagine finte.
type NavItem =
  | { label: string; href: string }
  | { label: string; action: 'points' | 'chat' | 'soon' }

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Negozio', href: '/shop' },
  { label: 'Promozioni', href: '/promo' },
  { label: 'Promo Box', action: 'soon' },
  { label: 'Lotteria', href: '/lotteria' },
  { label: 'Volantino', href: '/volantino' },
  { label: 'Punti', action: 'points' },
  { label: 'Zone di Consegna', href: '/consegne' },
  { label: 'Contatti', action: 'chat' },
]

export function HomeHeader() {
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const getTotalItems = useCartStore(s => s.getTotalItems)
  const itemCount = mounted ? getTotalItems() : 0
  const openPoints = useUIPanelsStore(s => s.openPoints)
  const openChat = useUIPanelsStore(s => s.openChat)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const runAction = (item: NavItem) => {
    setMenuOpen(false)
    if ('href' in item) return
    if (item.action === 'points') openPoints()
    else if (item.action === 'chat') openChat()
    else toast(`${item.label}: disponibile a breve! ✨`, { duration: 2000 })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-900/20 liquid-glass-header"
      style={{ background: 'rgba(3,19,26,0.75)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 select-none group">
          <img src="/logo/mgshop-logo-neon.png" alt="MGShop Casa"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover neon-glow-logo transition-transform group-hover:scale-105" />
          <span className="hidden sm:block text-lg font-bold tracking-tight text-white">
            MG<span className="text-shimmer">Shop</span> Casa
          </span>
        </Link>

        {/* Nav orizzontale, solo desktop */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-6 flex-1 justify-center px-4">
          {NAV_ITEMS.map(item => (
            'href' in item ? (
              <Link key={item.label} href={item.href}
                className="text-sm font-medium whitespace-nowrap transition-colors text-cyan-100/70 hover:text-cyan-300">
                {item.label}
              </Link>
            ) : (
              <button key={item.label} onClick={() => runAction(item)}
                className="text-sm font-medium whitespace-nowrap transition-colors text-cyan-100/70 hover:text-cyan-300">
                {item.label}
              </button>
            )
          ))}
        </nav>

        {/* Hamburger, solo mobile/tablet */}
        <div className="relative lg:hidden" ref={menuRef}>
          <button onClick={() => setMenuOpen(v => !v)} aria-label="Apri menu"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-cyan-300 btn-press">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl overflow-hidden shadow-xl animate-scale-in z-50"
              style={{ background: 'white', border: '1px solid rgba(8,145,178,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
              <div className="p-2 max-h-[70vh] overflow-y-auto">
                {NAV_ITEMS.map(item => (
                  'href' in item ? (
                    <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <button key={item.label} onClick={() => runAction(item)}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors">
                      {item.label}
                    </button>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Account + carrello */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={openPoints} aria-label="Il mio account"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-cyan-300 btn-press">
            <User className="w-5 h-5" />
          </button>
          <Link href="/carrello" aria-label="Vai al carrello"
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-cyan-300 btn-press">
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 text-white text-[10px] rounded-full flex items-center justify-center font-bold"
                style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
