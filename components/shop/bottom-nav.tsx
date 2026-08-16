"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Store, Tag, Package, Ticket, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useUIPanelsStore } from '@/lib/ui-panels-store'

// Barra di navigazione inferiore, solo mobile (nascosta da md in su, dove
// c'è già l'header con menu/ricerca/carrello). Usa solo route già esistenti:
// "Promo Box" non ha ancora una pagina propria (funzionalità futura), quindi
// mostra un avviso invece di navigare; "Account" apre lo stesso pannello
// punti già presente nel FloatingMenu, senza creare una pagina nuova.
const ITEMS = [
  { href: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  { href: '/shop', label: 'Negozio', icon: Store, match: (p: string) => p.startsWith('/shop') || p.startsWith('/prodotto') },
  { href: '/promo', label: 'Promo', icon: Tag, match: (p: string) => p.startsWith('/promo') },
  { href: '/lotteria', label: 'Lotteria', icon: Ticket, match: (p: string) => p.startsWith('/lotteria') },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const openPoints = useUIPanelsStore(s => s.openPoints)

  if (pathname?.startsWith('/mgadmin-panel')) return null

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navigazione principale"
    >
      <div className="mx-3 mb-2 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(240,251,253,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(8,145,178,0.12)',
          boxShadow: '0 8px 30px rgba(8,45,60,0.18)',
        }}>
        <div className="grid grid-cols-6 items-stretch">
          {ITEMS.map(item => {
            const active = item.match(pathname || '')
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 py-2.5 btn-press transition-colors"
                style={{ color: active ? '#0891b2' : '#5b7c85' }}>
                <Icon className="w-5 h-5" style={active ? { filter: 'drop-shadow(0 0 6px rgba(8,145,178,0.4))' } : undefined} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            )
          })}

          <button
            onClick={() => toast('Promo Box in arrivo presto! 📦', { duration: 2000 })}
            className="flex flex-col items-center justify-center gap-0.5 py-2.5 btn-press transition-colors"
            style={{ color: '#8b5cf6' }}>
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">Promo Box</span>
          </button>

          <button
            onClick={openPoints}
            className="flex flex-col items-center justify-center gap-0.5 py-2.5 btn-press transition-colors"
            style={{ color: '#5b7c85' }}>
            <UserRound className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">Account</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
