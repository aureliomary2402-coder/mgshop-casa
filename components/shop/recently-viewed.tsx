"use client"
import Image from 'next/image'

import { useState, useEffect } from 'react'
import { History, ChevronDown } from 'lucide-react'
import { useRecentlyViewedStore } from '@/lib/recently-viewed-store'
import { useProductDetailStore } from '@/lib/product-detail-store'
import { optimizeImage } from '@/lib/image'
import type { Product } from '@/lib/types'

// "Visti di recente" a comparsa: di default è chiuso (una piccola pillola con
// il numero di prodotti), così non ingombra. L'utente lo apre quando vuole e
// la scelta viene ricordata. Utile perché sul sito si naviga molto a popup
// (la scheda prodotto si apre in un modal), quindi è facile perdere il filo
// di cosa si è già guardato. escludeId serve per non mostrare, nella scheda
// di un prodotto, il prodotto stesso.
export function RecentlyViewed({ excludeId, title = 'Visti di recente' }: { excludeId?: string; title?: string }) {
  const ids = useRecentlyViewedStore(s => s.ids)
  const expanded = useRecentlyViewedStore(s => s.expanded)
  const setExpanded = useRecentlyViewedStore(s => s.setExpanded)
  const clear = useRecentlyViewedStore(s => s.clear)
  const [products, setProducts] = useState<Product[]>([])
  const openDetail = useProductDetailStore(s => s.open)

  const relevantIds = ids.filter(id => id !== excludeId)

  // I prodotti si scaricano solo quando la riga è aperta: da chiusa non costa nulla.
  useEffect(() => {
    if (!expanded) return
    if (relevantIds.length === 0) { setProducts([]); return }
    fetch(`/api/shop/products?ids=${relevantIds.join(',')}`)
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => setProducts([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, relevantIds.join(',')])

  if (relevantIds.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-950 transition-colors hover:border-cyan-300 btn-press"
          style={{ boxShadow: '0 6px 18px rgba(8,145,178,0.07)' }}
        >
          <History className="h-4 w-4 text-cyan-600" />
          {title}
          <span className="rounded-full bg-cyan-100 px-1.5 py-0.5 text-[10px] leading-none text-cyan-800">{relevantIds.length}</span>
          <ChevronDown className="h-3.5 w-3.5 text-cyan-700 transition-transform duration-300" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
        </button>
        {expanded && (
          <button type="button" onClick={clear} className="text-[11px] font-bold text-slate-500 underline-offset-2 hover:text-cyan-700 hover:underline">
            Svuota
          </button>
        )}
      </div>

      {/* apertura morbida: l'altezza passa da 0 a quella del contenuto */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr', opacity: expanded ? 1 : 0 }}
        aria-hidden={!expanded}
      >
        <div className="overflow-hidden">
          <div className="flex gap-3 overflow-x-auto pb-2 pt-3 scrollbar-hide">
            {products.map(p => {
              const imgUrl = optimizeImage(p.card_image || p.cover_image, 200)
              return (
                <button key={p.id} onClick={() => openDetail(p.id)} tabIndex={expanded ? 0 : -1}
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
      </div>
    </div>
  )
}
