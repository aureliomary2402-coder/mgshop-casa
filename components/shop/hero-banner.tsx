"use client"

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ShoppingBag, Truck, Banknote, Star, Package } from 'lucide-react'
import type { Banner, Category } from '@/lib/types'
import { AmbientBubbles } from './ambient-bubbles'
import { PageHeroIcon } from './page-hero-icon'
import { SOCIAL_LINKS, WHATSAPP_NUMBER, WhatsAppIcon } from './social-icons'

const ADVANTAGES = [
  { icon: Truck, label: 'Consegna a domicilio o ritiro' },
  { icon: Banknote, label: 'Paghi alla consegna o al ritiro' },
  { icon: Star, label: 'Raccogli punti ad ogni acquisto' },
  { icon: Package, label: 'Lotteria ogni settimana' },
]

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

  return (
    <section>
      <div className="relative overflow-hidden theme-hero-dark">
        <AmbientBubbles count={9} theme="dark" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 text-center">
          <PageHeroIcon icon={ShoppingBag} color="#db2777" />
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-4" style={{ background: 'rgba(8,145,178,0.15)', color: '#67e8f9', border: '1px solid rgba(103,232,249,0.3)' }}>
            <ShoppingBag className="w-4 h-4" /> Il tuo negozio online
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-shimmer">{title}</h1>
          <p className="text-lg" style={{ color: 'rgba(224,247,250,0.75)' }}>{subtitle}</p>

          {banners.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {banners.map((_, i) => (
                <button key={i} onClick={() => setCurrentIndex(i)}
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: i === currentIndex ? 16 : 6, background: i === currentIndex ? '#db2777' : 'rgba(255,255,255,0.25)' }} />
              ))}
            </div>
          )}
        </div>

        {banners.length > 1 && (
          <>
            <button onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2 transition z-20 hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <ChevronLeft className="w-5 h-5" style={{ color: '#67e8f9' }} />
            </button>
            <button onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 transition z-20 hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <ChevronRight className="w-5 h-5" style={{ color: '#67e8f9' }} />
            </button>
          </>
        )}
      </div>

      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg,#eafbff 0%,#f5fdff 45%,#ffffff 100%)' }}>
        <AmbientBubbles count={10} theme="light" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden"
            style={{ background: 'rgba(8,145,178,0.1)' }}>
            {ADVANTAGES.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 p-3.5 sm:p-4" style={{ background: 'rgba(255,255,255,0.85)' }}>
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(8,145,178,0.1)', color: '#0891b2' }}>
                  <a.icon className="w-4 h-4" />
                </span>
                <span className="text-[11px] sm:text-xs font-semibold leading-snug" style={{ color: '#0c2b36' }}>{a.label}</span>
              </div>
            ))}
          </div>
            <a
            href={SOCIAL_LINKS.whatsappChat}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2.5 w-full rounded-2xl p-3.5 sm:p-4 transition-transform hover:-translate-y-0.5"
            style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)' }}
          >
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 text-white" style={{ background: '#25d366' }}>
              <WhatsAppIcon size={16} />
            </span>
            <span className="text-[11px] sm:text-xs font-semibold" style={{ color: '#0c2b36' }}>
              Scrivici su WhatsApp · {WHATSAPP_NUMBER}
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}
