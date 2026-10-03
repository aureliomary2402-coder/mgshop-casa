"use client"
import Image from 'next/image'

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
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
        <History className="w-4 h-4 text-cyan-600" /> {title}
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
