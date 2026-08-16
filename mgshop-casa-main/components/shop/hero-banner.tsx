"use client"

import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, ShoppingBag, Truck, Banknote, Star, Package } from 'lucide-react'
import type { Banner, Category } from '@/lib/types'
import { AmbientBubbles } from './ambient-bubbles'

const ADVANTAGES = [
  { icon: Truck, label: 'Consegna a mano nella tua zona' },
  { icon: Banknote, label: 'Paghi alla consegna' },
  { icon: Star, label: 'Raccogli punti ad ogni acquisto' },
  { icon: Package, label: 'Lotteria ogni settimana' },
]

// La funzione "categories" resta nella firma per compatibilita con chi
// chiama questo componente, ma la selezione categoria ora vive nella
// CategorySidebar: qui l'hero si limita a mostrare titolo/sottotitolo del
// banner attivo (gestibile da admin) piu la bolla vetro e i vantaggi.
export function HeroBanner({ banners }: { banners: Banner[]; categories?: Category[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % banners.length), 5000)
    return () => clearInterval(interval)
  }, [banners.length])

  const current: Partial<Banner> | undefined = banners[currentIndex]
  const title = current?.title || 'NEGOZIO'
  const subtitle = current?.subtitle || 'Scopri tutti i prodotti per la tua casa. Qualita e convenienza, sempre.'

  const rgb = '219,39,119'

  return (
    <section className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg,#B5D6F6 0%,#EDF5FD 55%,#ffffff 100%)' }}>
      <AmbientBubbles count={10} theme="light" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8 pb-8 md:py-14 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="max-w-xl">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-3" style={{ color: '#041C33' }}>
            {title}
          </h1>
          <p className="text-sm md:text-lg leading-relaxed" style={{ color: '#041C33cc' }}>
            {subtitle}
          </p>
        </div>

        <div
          className="glass-bubble shrink-0 w-28 h-28 md:w-40 md:h-40 mx-auto md:mx-0 rounded-full flex items-center justify-center overflow-hidden animate-bubble-bob"
          style={{ '--tint': `rgba(${rgb},0.30)`, '--tint-strong': `rgba(${rgb},0.38)` } as CSSProperties}
        >
          <span className="glass-bubble-sheen" />
          <ShoppingBag className="relative z-10 w-11 h-11 md:w-16 md:h-16" style={{ color: '#D86183' }} />
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden"
          style={{ background: 'rgba(8,145,178,0.1)' }}>
          {ADVANTAGES.map((a, i) => (
            <div key={i} className="flex items-center gap-2.5 p-3.5 sm:p-4" style={{ background: 'rgba(255,255,255,0.85)' }}>
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(8,145,178,0.1)', color: '#2578A4' }}>
                <a.icon className="w-4 h-4" />
              </span>
              <span className="text-[11px] sm:text-xs font-semibold leading-snug" style={{ color: '#041C33' }}>{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/3 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition z-20">
            <ChevronLeft className="w-5 h-5" style={{ color: '#2578A4' }} />
          </button>
          <button onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
            className="absolute right-3 top-1/3 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition z-20">
            <ChevronRight className="w-5 h-5" style={{ color: '#2578A4' }} />
          </button>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrentIndex(i)}
                className="h-1.5 rounded-full transition-all"
                style={{ width: i === currentIndex ? 16 : 6, background: i === currentIndex ? '#D86183' : 'rgba(8,145,178,0.25)' }} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
