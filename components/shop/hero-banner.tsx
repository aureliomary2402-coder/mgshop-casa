"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowRight, ChevronUp } from 'lucide-react'
import type { Banner, Category } from '@/lib/types'
import { AmbientBubbles } from './ambient-bubbles'

export function HeroBanner({ banners }: { banners: Banner[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCategories, setShowCategories] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % banners.length), 5000)
    return () => clearInterval(interval)
  }, [banners.length])

  useEffect(() => {
    fetch('/api/admin/categories').then(r => r.json()).then(setCategories).catch(() => {})
  }, [])

  // Banner sempre "disegnato" a codice: niente foto caricate, sempre nitido a qualsiasi risoluzione.
  const current: Partial<Banner> | undefined = banners[currentIndex]
  const title = current?.title || 'MGShop Casa'
  const subtitle = current?.subtitle || 'Detersivi, articoli per la casa e per il corpo. Qualità e convenienza in ogni ordine.'

  const bubbleStyle = (i: number) => ({
    background: 'radial-gradient(circle at 30% 25%, #a5f3fc, #0891b2 55%, #155e75 100%)',
    boxShadow: 'inset -3px -4px 8px rgba(0,0,0,0.25), inset 3px 4px 7px rgba(255,255,255,0.5), 0 8px 18px rgba(0,0,0,0.2)',
    animationDelay: `${i * 70}ms`,
  })

  return (
    <section className="relative overflow-hidden" style={{ background: 'linear-gradient(120deg, #0c2b36 0%, #0891b2 55%, #06b6d4 100%)' }}>
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

        {!showCategories ? (
          <button onClick={() => setShowCategories(true)}
            className="group inline-flex items-center gap-2 font-bold text-sm md:text-base px-6 py-3 rounded-xl text-cyan-800 bg-white transition-all hover:scale-105 btn-press neon-glow">
            Scopri i prodotti
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Scegli una categoria</p>
              <button onClick={() => setShowCategories(false)} aria-label="Richiudi categorie"
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
                <ChevronUp className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {categories.map((cat, i) => (
                <Link key={cat.id} href={`/shop?categoria=${cat.slug}`}
                  className="animate-bubble-pop-in animate-bubble-bob inline-flex items-center justify-center text-center rounded-full px-5 py-4 min-w-[92px] font-semibold text-xs text-white transition-transform hover:scale-110 btn-press"
                  style={bubbleStyle(i)}>
                  {cat.name}
                </Link>
              ))}
              <Link href="/shop"
                className="animate-bubble-pop-in animate-bubble-bob inline-flex items-center justify-center text-center rounded-full px-5 py-4 min-w-[92px] font-semibold text-xs text-cyan-800 bg-white transition-transform hover:scale-110 btn-press"
                style={{ animationDelay: `${categories.length * 70}ms` }}>
                Tutti
              </Link>
            </div>
          </div>
        )}
      </div>

      {banners.length > 1 && (
        <>
          <button onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition z-20">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition z-20">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white w-4' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
