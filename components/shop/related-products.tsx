"use client"
import Image from 'next/image'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { useProductDetailStore } from '@/lib/product-detail-store'
import { optimizeImage } from '@/lib/image'
import type { Product } from '@/lib/types'

// Riga "Potrebbero interessarti anche": stessa categoria del prodotto
// aperto, così chi guarda scarpe vede altre scarpe, non prodotti a caso.
// Dà un motivo per continuare a girare invece di chiudere la scheda.
export function RelatedProducts({ categorySlug, excludeId }: { categorySlug?: string; excludeId: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const openDetail = useProductDetailStore(s => s.open)

  useEffect(() => {
    if (!categorySlug) { setProducts([]); return }
    fetch(`/api/shop/products?categoria=${encodeURIComponent(categorySlug)}&pagina=1`)
      .then(r => r.json())
      .then(d => setProducts((d.products || []).filter((p: Product) => p.id !== excludeId).slice(0, 8)))
      .catch(() => setProducts([]))
  }, [categorySlug, excludeId])

  if (products.length === 0) return null

  return (
    <div className="pt-2">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
        <Sparkles className="w-4 h-4 text-cyan-600" /> Potrebbero interessarti anche
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {products.map(p => {
          const imgUrl = optimizeImage(p.card_image || p.cover_image, 200)
          return (
            <button key={p.id} onClick={() => openDetail(p.id)}
              className="shrink-0 w-28 text-left group">
              <div className="relative mb-2 h-28 w-28 overflow-hidden rounded-[22px] border border-slate-200 bg-cyan-50 transition-transform group-hover:-translate-y-1">
                {imgUrl && <Image src={imgUrl} alt={p.name} fill sizes="112px" className="object-cover" />}
              </div>
              <p className="line-clamp-2 text-xs font-bold leading-snug text-slate-900">{p.name}</p>
              <p className="text-sm font-black text-cyan-700">€{p.price.toFixed(2)}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
