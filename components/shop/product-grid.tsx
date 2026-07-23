"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { ProductCard } from './product-card'
import type { Product } from '@/lib/types'

const PAGE_SIZE = 30

export function ProductGrid({
  initialProducts,
  count,
  q,
  categoria,
}: {
  initialProducts: Product[]
  count: number
  q?: string
  categoria?: string
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Se cambia la ricerca/categoria (navigazione lato server), riparti da capo
  useEffect(() => {
    setProducts(initialProducts)
    setPage(1)
  }, [initialProducts])

  const hasMore = products.length < count

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    const nextPage = page + 1
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (categoria) params.set('categoria', categoria)
    params.set('pagina', String(nextPage))
    try {
      const res = await fetch(`/api/shop/products?${params.toString()}`)
      const data = await res.json()
      setProducts(prev => [...prev, ...(data.products || [])])
      setPage(nextPage)
    } catch {
      // silenzioso: l'utente pu\u00f2 comunque scorrere e riprovare pi\u00f9 tardi
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, page, q, categoria])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore()
    }, { rootMargin: '600px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  return (
    <>
      <div id="prodotti-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 stagger-children scroll-mt-24">
        {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-10">
          {loading && (
            <div className="w-8 h-8 rounded-full border-2 border-cyan-200 animate-spin" style={{ borderTopColor: '#0891b2' }} />
          )}
        </div>
      )}
    </>
  )
}
