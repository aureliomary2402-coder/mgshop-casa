"use client"

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ShoppingBag, Truck, Banknote, Star, Package } from 'lucide-react'
import type { Banner, Category } from '@/lib/types'
import { HeroBackdrop, AccentTitle } from './hero-backdrop'
import { SOCIAL_LINKS, WHATSAPP_NUMBER, WhatsAppIcon } from './social-icons'

const ADVANTAGES = [
  { icon: Truck, label: 'Consegna a domicilio o ritiro' },
  { icon: Banknote, label: 'Paghi alla consegna o al ritiro' },
  { icon: Star, label: 'Raccogli punti ad ogni acquisto' },
  { icon: Package, label: 'Lotteria ogni settimana' },
]

const ARROW =
  'absolute top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/15 bg-white/10 p-2 text-cyan-200 backdrop-blur-md transition hover:bg-white/15'

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
      <div className="relative overflow-hidden bg-[#06151c]">
        <HeroBackdrop />
        <div className="relative z-10 mx-auto max-w-4xl px-5 pb-14 pt-12 text-center sm:px-8 sm:pb-20">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
            <ShoppingBag className="h-7 w-7 text-cyan-300" />
          </div>
          <div className="mb-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200 backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
              Il tuo negozio online
            </span>
          </div>
          <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.045em] text-white sm:text-6xl">
            <AccentTitle text={title} />
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">{subtitle}</p>

          {banners.length > 1 && (
            <div className="mt-7 flex items-center justify-center gap-2">
              {banners.map((_, i) => (
                <button key={i} onClick={() => setCurrentIndex(i)} aria-label={`Banner ${i + 1}`}
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: i === currentIndex ? 20 : 6, background: i === currentIndex ? '#22d3ee' : 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          )}
        </div>

        {banners.length > 1 && (
          <>
            <button onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
              className={`${ARROW} left-3`} aria-label="Banner precedente">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
              className={`${ARROW} right-3`} aria-label="Banner successivo">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
          {ADVANTAGES.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4 sm:px-6">
              <a.icon className="h-5 w-5 shrink-0 text-cyan-600" />
              <span className="text-xs font-bold leading-snug text-slate-800">{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#f0fbfd] px-5 py-5 sm:px-8">
        <a
          href={SOCIAL_LINKS.whatsappChat}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto flex max-w-7xl items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 transition hover:-translate-y-0.5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white">
            <WhatsAppIcon size={17} />
          </span>
          <span className="text-xs font-bold text-slate-800 sm:text-sm">
            Scrivici su WhatsApp · {WHATSAPP_NUMBER}
          </span>
        </a>
      </div>
    </section>
  )
}
