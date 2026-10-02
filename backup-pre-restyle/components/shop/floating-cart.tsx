"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'

// Barra del carrello che compare in basso non appena si aggiunge un
// prodotto, cosi' si puo' andare al checkout da qualsiasi punto della
// pagina senza dover risalire fino in cima. Resta visibile finche' il
// carrello contiene articoli. Nascosta nella pagina carrello stessa
// (sarebbe ridondante) e nel pannello admin. Posizionata sopra la
// bottom-nav mobile e centrata, cosi' non copre mai i pulsanti fluttuanti
// (chat e torna-su) che stanno sui bordi sinistro/destro.
export function FloatingCart() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [bump, setBump] = useState(false)
  const lastAdded = useCartStore(s => s.lastAdded)
  const getTotalItems = useCartStore(s => s.getTotalItems)
  const getTotalPrice = useCartStore(s => s.getTotalPrice)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (lastAdded === 0) return
    setBump(true)
    const t = setTimeout(() => setBump(false), 500)
    return () => clearTimeout(t)
  }, [lastAdded])

  const hidden = pathname?.startsWith('/mgadmin-panel') || pathname?.startsWith('/carrello')

  const itemCount = mounted ? getTotalItems() : 0
  const total = mounted ? getTotalPrice() : 0
  const visible = mounted && !hidden && itemCount > 0

  if (hidden) return null

  return (
    <Link
      href="/carrello"
      aria-label="Vai al carrello"
      className="fixed inset-x-0 z-[46] flex justify-center px-4 transition-all duration-300"
      style={{
        bottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.92)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        className={`flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl w-full max-w-sm btn-press ${bump ? 'animate-cart-bounce' : ''}`}
        style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 10px 30px rgba(8,145,178,0.45)' }}
      >
        <div className="relative shrink-0">
          <ShoppingBag className="w-5 h-5 text-white" />
          <span
            className={`absolute -top-2 -right-2 rounded-full bg-white text-xs font-bold flex items-center justify-center ${bump ? 'animate-badge-pop' : ''}`}
            style={{ color: '#0891b2', minWidth: 18, height: 18, padding: '0 4px' }}
          >
            {itemCount > 9 ? '9+' : itemCount}
          </span>
        </div>
        <span className="text-white text-sm font-semibold flex-1 truncate">
          {itemCount} articol{itemCount === 1 ? 'o' : 'i'} · €{total.toFixed(2)}
        </span>
        <span className="flex items-center gap-1 text-white text-sm font-bold px-3 py-1.5 rounded-xl shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
          Checkout <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  )
}
