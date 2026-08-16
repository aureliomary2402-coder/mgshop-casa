"use client"

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, Search, ShoppingBag, Tag, Ticket, Newspaper, MapPin, Home as HomeIcon, Package } from 'lucide-react'
import { toast } from 'sonner'
import { useCartStore } from '@/lib/cart-store'

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/shop', label: 'Negozio', icon: ShoppingBag },
  { href: '/promo', label: 'Promozioni', icon: Tag },
  { href: '/lotteria', label: 'Lotteria', icon: Ticket },
  { href: '/volantino', label: 'Volantino', icon: Newspaper },
  { href: '/consegne', label: 'Zone di consegna', icon: MapPin },
]

export function HomeHeader() {
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const getTotalItems = useCartStore(s => s.getTotalItems)
  const itemCount = mounted ? getTotalItems() : 0

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="sticky top-0 z-50"
      style={{ background: 'rgba(240,251,253,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(8,145,178,0.1)' }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(v => !v)} aria-label="Apri menu"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-cyan-50 text-cyan-800 btn-press">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-60 rounded-2xl overflow-hidden shadow-xl animate-scale-in z-50"
              style={{ background: 'white', border: '1px solid rgba(8,145,178,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
              <div className="p-2">
                {NAV_LINKS.map(link => (
                  <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors">
                    <link.icon className="w-4 h-4 text-cyan-600" />
                    {link.label}
                  </Link>
                ))}
                <button onClick={() => { setMenuOpen(false); toast('Promo Box in arrivo presto! 📦', { duration: 2000 }) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-cyan-50 transition-colors">
                  <Package className="w-4 h-4 text-purple-500" /> Promo Box <span className="text-[10px] text-slate-400 ml-auto">presto</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <Link href="/" className="flex flex-col items-center leading-none select-none">
          <span className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: '#0c2b36' }}>MG</span>
          <span className="text-xs sm:text-sm font-bold tracking-[0.35em]" style={{ color: '#0891b2' }}>SHOP</span>
        </Link>

        <div className="flex items-center gap-1">
          <Link href="/shop" aria-label="Cerca prodotti"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-cyan-50 text-cyan-800 btn-press">
            <Search className="w-5 h-5" />
          </Link>
          <Link href="/carrello" aria-label="Vai al carrello"
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-cyan-50 text-cyan-800 btn-press">
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
