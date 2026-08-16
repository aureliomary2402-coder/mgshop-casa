"use client"

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, ShoppingBag, User } from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/lib/cart-store'
import { useUIPanelsStore } from '@/lib/ui-panels-store'

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

export function GlobalHeader() {
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const getTotalItems = useCartStore(s => s.getTotalItems)
  const itemCount = mounted ? getTotalItems() : 0
  const openPoints = useUIPanelsStore(s => s.openPoints)
  const openChat = useUIPanelsStore(s => s.openChat)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
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
    <header className="sticky top-0 z-50 liquid-glass-nav">
      <div
        className="pointer-events-none absolute inset-0 rounded-none"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at 30% -10%, rgba(255,255,255,0.75), rgba(255,255,255,0) 60%)',
          mixBlendMode: 'screen',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 select-none group">
          <img
            src="/logo/mgshop-logo-neon.png"
            alt="MGShop Casa"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover neon-glow-logo transition-transform group-hover:scale-105"
          />
          <span className="hidden sm:block text-lg font-bold tracking-tight text-slate-800">
            MG<span className="text-shimmer">Shop</span> Casa
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-5 xl:gap-6 flex-1 justify-center">
          {NAV_ITEMS.map(item =>
            'href' in item ? (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-slate-700 hover:text-cyan-700 transition-colors relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full" />
              </Link>
            ) : (
              <button
                key={item.label}
                onClick={() => runAction(item)}
                className="text-sm font-medium text-slate-700 hover:text-cyan-700 transition-colors relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full" />
              </button>
            )
          )}
        </nav>

        <button
          onClick={() => setMenuOpen(o => !o)}
          className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-white/60 transition-colors"
          aria-label="Menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute top-full left-4 right-4 mt-2 rounded-2xl p-4 lg:hidden liquid-glass-card"
          >
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map(item =>
                'href' in item ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    onClick={() => runAction(item)}
                    className="text-left block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors"
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openPoints}
            className="p-2 rounded-xl text-slate-700 hover:bg-white/60 transition-colors relative"
            aria-label="Account"
          >
            <User className="w-5 h-5" />
          </button>
          <Link
            href="/carrello"
            className="p-2 rounded-xl text-slate-700 hover:bg-white/60 transition-colors relative"
            aria-label="Carrello"
          >
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center animate-badge-pop">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
