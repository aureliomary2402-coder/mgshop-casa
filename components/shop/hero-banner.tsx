"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react'
import type { Banner, Category } from '@/lib/types'
import { LandingHero } from './landing-hero'
import { SOCIAL_LINKS, WHATSAPP_NUMBER, WhatsAppIcon } from './social-icons'

const ARROW =
  'rounded-full border border-white/15 bg-white/10 p-2 text-cyan-200 backdrop-blur-md transition hover:bg-white/15'

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
      <LandingHero
        icon={ShoppingBag}
        badge={{ text: 'Il tuo negozio online' }}
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <a
              href="#prodotti-grid"
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 font-black text-[#05212a] shadow-[0_15px_50px_rgba(34,211,238,.22)] transition duration-300 hover:-translate-y-1 hover:bg-cyan-300"
            >
              Sfoglia il catalogo
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <Link
              href="/promo"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-7 font-bold text-white backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/15"
            >
              <Sparkles className="h-[18px] w-[18px]" />
              Scopri le promo
            </Link>
          </>
        }
      >
        {banners.length > 1 && (
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
              className={ARROW} aria-label="Banner precedente">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              {banners.map((_, i) => (
                <button key={i} onClick={() => setCurrentIndex(i)} aria-label={`Banner ${i + 1}`}
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: i === currentIndex ? 20 : 6, background: i === currentIndex ? '#22d3ee' : 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
            <button onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
              className={ARROW} aria-label="Banner successivo">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </LandingHero>

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
