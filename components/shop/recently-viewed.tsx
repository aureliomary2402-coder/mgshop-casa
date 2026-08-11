"use client"

import { useState, useEffect } from 'react'
import { History } from 'lucide-react'
import { useRecentlyViewedStore } from '@/lib/recently-viewed-store'
import { useProductDetailStore } from '@/lib/product-detail-store'
import { optimizeImage } from '@/lib/image'
import type { Product } from '@/lib/types'

// Riga "Visti di recente": utile soprattutto perché sul sito si naviga molto
// a popup (la scheda prodotto si apre in un modal sopra la pagina), quindi
// è facile perdere il filo di cosa si è già guardato. escludeId serve per
// non mostrare, nella scheda di un prodotto, il prodotto stesso.
export function RecentlyViewed({ excludeId, title = 'Visti di recente' }: { excludeId?: string; title?: string }) {
  const ids = useRecentlyViewedStore(s => s.ids)
  const [products, setProducts] = useState<Product[]>([])
  const openDetail = useProductDetailStore(s => s.open)

  const relevantIds = ids.filter(id => id !== excludeId)

  useEffect(() => {
    if (relevantIds.length === 0) { setProducts([]); return }
    fetch(`/api/shop/products?ids=${relevantIds.join(',')}`)
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => setProducts([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relevantIds.join(',')])

  if (products.length === 0) return null

  return (
    <div>
      <p className="text-sm font-semibold flex items-center gap-1.5 mb-2.5" style={{ color: '#0c2b36' }}>
        <History className="w-4 h-4 text-cyan-600" /> {title}
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
