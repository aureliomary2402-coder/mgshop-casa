"use client"

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { ProductCard } from './product-card'
import type { Product } from '@/lib/types'

const PAGE_SIZE = 30
const CACHE_TTL = 30 * 60 * 1000 // 30 minuti

function cacheKey(q?: string, categoria?: string) {
  return `mgshop-grid:${categoria || ''}:${q || ''}`
}

function readCache(key: string, minLength: number): { products: Product[]; page: number; scrollY: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.products) || parsed.products.length < minLength) return null
    if (typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt > CACHE_TTL) return null
    return parsed
  } catch {
    return null
  }
}

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
  const key = cacheKey(q, categoria)
  // Al primo render controlla se esiste già una lista più lunga salvata (es. tornando da un prodotto)
  const cachedOnMount = useRef(readCache(key, initialProducts.length)).current
  const [products, setProducts] = useState<Product[]>(cachedOnMount ? cachedOnMount.products : initialProducts)
  const [page, setPage] = useState(cachedOnMount ? cachedOnMount.page : 1)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const prevKeyRef = useRef(key)
  const scrollRestoredRef = useRef(!cachedOnMount)
  const latestRef = useRef({ products, page })
  useEffect(() => { latestRef.current = { products, page } }, [products, page])

  // Riparte da capo SOLO se cambia davvero la ricerca/categoria (non ad ogni nuovo render del server)
  useEffect(() => {
    if (prevKeyRef.current === key) return
    prevKeyRef.current = key
    setProducts(initialProducts)
    setPage(1)
    scrollRestoredRef.current = true
  }, [key, initialProducts])

  // Ripristina lo scroll esattamente dove l'utente era rimasto, quando si torna da un prodotto
  useLayoutEffect(() => {
    if (scrollRestoredRef.current) return
    scrollRestoredRef.current = true
    if (cachedOnMount) window.scrollTo({ top: cachedOnMount.scrollY, behavior: 'auto' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Salva in continuo lista caricata + posizione di scroll, da ripristinare al "torna indietro"
  useEffect(() => {
    let raf = 0
    const save = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(key, JSON.stringify({
            products: latestRef.current.products,
            page: latestRef.current.page,
            scrollY: window.scrollY,
            savedAt: Date.now(),
          }))
        } catch {}
      })
    }
    save()
    window.addEventListener('scroll', save, { passive: true })
    return () => { window.removeEventListener('scroll', save); cancelAnimationFrame(raf) }
  }, [key])

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
      // silenzioso: l'utente può comunque scorrere e riprovare più tardi
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
