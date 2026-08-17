"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Heart, ShoppingCart, Trash2, ImageIcon } from 'lucide-react'
import { useWishlistStore } from '@/lib/wishlist-store'
import { useCartStore } from '@/lib/cart-store'
import { useProductDetailStore } from '@/lib/product-detail-store'
import { optimizeImage } from '@/lib/image'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { PageHero } from '@/components/shop/page-hero'

export default function PreferitiPage() {
  const ids = useWishlistStore(s => s.ids)
  const removeFromWishlist = useWishlistStore(s => s.remove)
  const addItem = useCartStore(s => s.addItem)
  const openDetail = useProductDetailStore(s => s.open)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    if (ids.length === 0) { setProducts([]); setLoading(false); return }
    setLoading(true)
    fetch(`/api/shop/products?ids=${ids.join(',')}`)
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, ids.join(',')])

  const handleAdd = (p: Product) => {
    if (p.torna_presto) return
    addItem(p)
    toast.success(`${p.name} aggiunto al carrello!`, {
      style: { background: '#cffafe', border: '1px solid #0891b2', color: '#155e75' }
    })
  }

  if (!mounted || loading) {
    return (
      <>
        <PageHero icon={Heart} iconColor="#f472b6" title="Preferiti" subtitle="I prodotti che hai salvato, pronti quando vuoi tu." />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />)}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHero icon={Heart} iconColor="#f472b6" title="Preferiti" subtitle="I prodotti che hai salvato, pronti quando vuoi tu." />
      <div className="max-w-5xl mx-auto px-4 py-8">
      {products.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.08)' }}>
            <Heart className="w-7 h-7" style={{ color: '#ef4444' }} />
          </div>
          <p className="text-lg font-medium text-slate-600 mb-1">Nessun preferito ancora</p>
          <p className="text-sm text-slate-400 mb-6">Tocca il cuoricino su un prodotto per salvarlo qui.</p>
          <Link href="/shop" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white btn-press"
            style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}>
            Vai al negozio
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map(p => {
            const imgUrl = optimizeImage(p.card_image || p.cover_image, 300)
            return (
              <div key={p.id} className="rounded-2xl overflow-hidden animate-fade-in-up"
                style={{ background: 'white', border: '1px solid rgba(8,145,178,0.08)' }}>
                <div className="relative aspect-square cursor-pointer" style={{ background: 'linear-gradient(135deg, #f0fbfd, #cffafe)' }}
                  onClick={() => openDetail(p.id)}>
                  {imgUrl ? (
                    <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8" style={{ color: 'rgba(8,145,178,0.3)' }} />
                    </div>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); removeFromWishlist(p.id) }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center btn-press"
                    style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                    aria-label="Rimuovi dai preferiti">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-2 leading-snug cursor-pointer" style={{ color: '#0c2b36' }}
                    onClick={() => openDetail(p.id)}>
                    {p.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base" style={{ color: '#0891b2' }}>€{p.price.toFixed(2)}</span>
                    <button onClick={() => handleAdd(p)} disabled={p.torna_presto}
                      className="flex items-center gap-1 text-white text-xs font-semibold px-3 py-1.5 rounded-full btn-press transition-all disabled:cursor-not-allowed"
                      style={p.torna_presto
                        ? { background: '#94a3b8', boxShadow: 'none' }
                        : { background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 2px 8px rgba(8,145,178,0.3)' }}>
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </>
  )
}
