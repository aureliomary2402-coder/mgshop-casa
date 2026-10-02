"use client"
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import type { Product } from '@/lib/types'
import {
  VolantinoFlyerView, VolantinoEmptyState, VolantinoLoadingState,
  type VolantinoData,
} from '@/components/shop/volantino-flyer-view'

export default function VolantinoSlugPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const [data, setData] = useState<VolantinoData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/volantino/${slug}`, { cache: 'no-store' })
      .then(async r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return }
        const d: VolantinoData = await r.json()
        if (!d.is_active) { setNotFound(true); setLoading(false); return }
        setData(d)
        if (d.items && d.items.length > 0) {
          const allProducts = await fetch('/api/admin/products').then(r => r.json())
          const ids = d.items.map(i => i.product_id)
          setProducts(allProducts.filter((p: Product) => ids.includes(p.id)))
        }
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  if (loading) return <VolantinoLoadingState />
  if (notFound || !data) return <VolantinoEmptyState />

  return <VolantinoFlyerView data={data} products={products} showBackToList />
}
