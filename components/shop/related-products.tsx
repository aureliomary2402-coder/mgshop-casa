"use client"

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
      <p className="text-sm font-semibold flex items-center gap-1.5 mb-2.5" style={{ color: '#0c2b36' }}>
        <Sparkles className="w-4 h-4 text-cyan-600" /> Potrebbero interessarti anche
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {products.map(p => {
          const imgUrl = optimizeImage(p.card_image || p.cover_image, 200)
          return (
            <button key={p.id} onClick={() => openDetail(p.id)}
              className="shrink-0 w-28 text-left group">
              <div className="w-28 h-28 rounded-2xl overflow-hidden mb-1.5 transition-transform group-hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #f0fbfd, #cffafe)', border: '1px solid rgba(8,145,178,0.08)' }}>
                {imgUrl && <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" />}
              </div>
              <p className="text-xs font-medium line-clamp-2 leading-snug" style={{ color: '#0c2b36' }}>{p.name}</p>
              <p className="text-xs font-bold" style={{ color: '#0891b2' }}>€{p.price.toFixed(2)}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
