"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, ShoppingBag, User, Tag, Newspaper, Ticket, MapPin } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useUIPanelsStore } from '@/lib/ui-panels-store'

// Header usato SOLO nelle pagine prive di un proprio header (Lotteria,
// Volantino, Promo, Zone di consegna): va importato esplicitamente nel
// layout/page di quelle sezioni, MAI nel layout root, per evitare che
// compaia insieme a HomeHeader o ShopHeader (doppia barra).
type NavItem =
  | { label: string; href: string; icon: typeof Tag }
  | { label: string; action: 'points'; icon: typeof Tag }

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: Tag },
  { label: 'Negozio', href: '/shop', icon: Tag },
  { label: 'Promozioni', href: '/promo', icon: Tag },
  { label: 'Lotteria', href: '/lotteria', icon: Ticket },
  { label: 'Volantino', href: '/volantino', icon: Newspaper },
  { label: 'Zone di Consegna', href: '/consegne', icon: MapPin },
]

export function GlobalHeader() {
  const pathname = usePathname() || '/'
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const getTotalItems = useCartStore(s => s.getTotalItems)
  const itemCount = mounted ? getTotalItems() : 0
  const openPoints = useUIPanelsStore(s => s.openPoints)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  return (
    <header className="sticky top-0 z-50 liquid-glass-header"
      style={{ background: 'rgba(240,251,253,0.98)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(8,145,178,0.1)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 select-none group">
          <img src="/logo/mgshop-logo-neon.png" alt="MGShop Casa"
            className="w-10 h-10 rounded-full object-cover transition-transform group-hover:scale-105" />
          <span className="hidden sm:block text-lg font-bold tracking-tight" style={{ color: '#0c2b36' }}>
            MG<span style={{ color: '#0891b2' }}>Shop</span> Casa
          </span>
        </Link>

        {/* Nav orizzontale, solo desktop */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-6 flex-1 justify-center px-4">
          {NAV_ITEMS.map(item => (
            'href' in item ? (
              <Link key={item.label} href={item.href}
                className="text-sm font-medium whitespace-nowrap transition-colors hover:text-cyan-600"
                style={{ color: pathname === item.href ? '#0891b2' : '#44403c' }}>
                {item.label}
              </Link>
            ) : (
              <button key={item.label} onClick={openPoints}
                className="text-sm font-medium whitespace-nowrap transition-colors hover:text-cyan-600" style={{ color: '#44403c' }}>
                {item.label}
              </button>
            )
          ))}
        </nav>

        {/* Hamburger, solo mobile/tablet */}
        <div className="relative lg:hidden" ref={menuRef}>
          <button onClick={() => setMenuOpen(v => !v)} aria-label="Apri menu"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-cyan-50 btn-press" style={{ color: '#0891b2' }}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {menuOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 rounded-2xl overflow-hidden shadow-xl animate-scale-in z-50"
              style={{ background: 'white', border: '1px solid rgba(8,145,178,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
              <div className="p-2 max-h-[70vh] overflow-y-auto">
                {NAV_ITEMS.map(item => (
                  'href' in item ? (
                    <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <button key={item.label} onClick={() => { setMenuOpen(false); openPoints() }}
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
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-cyan-50 btn-press" style={{ color: '#0891b2' }}>
            <User className="w-5 h-5" />
          </button>
          <Link href="/carrello" aria-label="Vai al carrello"
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-cyan-50 btn-press" style={{ color: '#0891b2' }}>
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
