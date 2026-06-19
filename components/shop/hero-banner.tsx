"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Banner } from '@/lib/types'

export function HeroBanner({ banners }: { banners: Banner[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % banners.length), 5000)
    return () => clearInterval(interval)
  }, [banners.length])

  if (banners.length === 0) {
    return (
      <section className="bg-gradient-to-r from-stone-100 to-amber-50">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-stone-800">
            Benvenuto in <span className="text-amber-600">MGShop Casa</span>
          </h1>
          <p className="text-stone-500 text-lg max-w-2xl mx-auto">
            Scopri la nostra collezione di articoli per la casa. Qualità e stile per ogni ambiente.
          </p>
        </div>
      </section>
    )
  }

  const current = banners[currentIndex]

  const Content = () => (
    <div className="relative aspect-[3/1] md:aspect-[4/1] w-full overflow-hidden rounded-none">
      <img src={current.image_url} alt={current.title || 'Banner'} className="w-full h-full object-cover" />
      {(current.title || current.subtitle) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex items-end">
          <div className="p-6 md:p-10">
            {current.title && <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">{current.title}</h2>}
            {current.subtitle && <p className="text-white/90 text-sm md:text-lg max-w-xl">{current.subtitle}</p>}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <section className="relative">
      {current.link ? <Link href={current.link}><Content /></Link> : <Content />}
      {banners.length > 1 && (
        <>
          <button onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
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
