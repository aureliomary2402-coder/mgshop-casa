"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowRight } from 'lucide-react'
import type { Banner } from '@/lib/types'
import { AmbientBubbles } from './ambient-bubbles'

export function HeroBanner({ banners }: { banners: Banner[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % banners.length), 5000)
    return () => clearInterval(interval)
  }, [banners.length])

  // Banner sempre "disegnato" a codice: niente foto caricate, sempre nitido a qualsiasi risoluzione.
  const current: Partial<Banner> | undefined = banners[currentIndex]
  const title = current?.title || 'MGShop Casa'
  const subtitle = current?.subtitle || 'Detersivi, articoli per la casa e per il corpo. Qualità e convenienza in ogni ordine.'
  const link = current?.link || '/shop'

  const Content = () => (
    <div className="relative overflow-hidden" style={{ background: 'linear-gradient(120deg, #0c2b36 0%, #0891b2 55%, #06b6d4 100%)' }}>
      <AmbientBubbles count={9} theme="dark" />
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full blur-[70px] opacity-30" style={{ background: 'radial-gradient(circle,#a5f3fc,transparent)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-14 md:py-20 flex flex-col items-start">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 animate-float"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
          <ShoppingBag className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight mb-3 max-w-2xl">
          {title}
        </h1>
        <p className="text-cyan-50/85 text-sm md:text-lg max-w-xl mb-7 leading-relaxed">
          {subtitle}
        </p>
        <span className="group inline-flex items-center gap-2 font-bold text-sm md:text-base px-6 py-3 rounded-xl text-cyan-800 bg-white transition-all hover:scale-105 btn-press">
          Scopri i prodotti
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </div>
  )

  return (
    <section className="relative">
      {link ? <Link href={link}><Content /></Link> : <Content />}
      {banners.length > 1 && (
        <>
          <button onClick={(e) => { e.preventDefault(); setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length) }}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition z-20">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={(e) => { e.preventDefault(); setCurrentIndex((prev) => (prev + 1) % banners.length) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition z-20">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {banners.map((_, i) => (
              <button key={i} onClick={(e) => { e.preventDefault(); setCurrentIndex(i) }}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white w-4' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
