"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Newspaper } from 'lucide-react'
import type { Product } from '@/lib/types'
import {
  VolantinoFlyerView, VolantinoEmptyState, VolantinoLoadingState,
  type VolantinoData,
} from '@/components/shop/volantino-flyer-view'

interface VolantinoListItem {
  id: string
  slug: string | null
  title: string
  subtitle: string | null
  is_active: boolean
  sort_order: number
}

export default function VolantinoPage() {
  const [list, setList] = useState<VolantinoListItem[] | null>(null)
  const [data, setData] = useState<VolantinoData | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/volantino', { cache: 'no-store' })
      .then(r => r.json())
      .then(async (items: VolantinoListItem[]) => {
        setList(items)

        // Con un solo volantino attivo lo mostriamo subito, senza far
        // passare il cliente da un selettore inutile.
        if (items.length === 1) {
          const key = items[0].slug || items[0].id
          const full: VolantinoData = await fetch(`/api/volantino/${key}`, { cache: 'no-store' }).then(r => r.json())
          setData(full)
          if (full.items && full.items.length > 0) {
            const allProducts = await fetch('/api/admin/products').then(r => r.json())
            const ids = full.items.map(i => i.product_id)
            setProducts(allProducts.filter((p: Product) => ids.includes(p.id)))
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <VolantinoLoadingState />
  if (!list || list.length === 0) return <VolantinoEmptyState />

  // Più volantini attivi contemporaneamente: mostra un selettore.
  if (list.length > 1) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#eafbff 0%,#f5fdff 45%,#ffffff 100%)' }}>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: '#0c2b36' }}>Scegli un volantino</h1>
          <div className="space-y-3">
            {list.map(item => (
              <Link key={item.id} href={`/volantino/${item.slug || item.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white hover:scale-[1.01] transition-transform"
                style={{ border: '2px solid #0c2b36', boxShadow: '4px 4px 0 rgba(12,43,54,0.9)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(8,145,178,0.1)' }}>
                  <Newspaper className="w-6 h-6" style={{ color: '#0891b2' }} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{item.title || 'Volantino'}</p>
                  {item.subtitle && <p className="text-sm text-slate-400 truncate">{item.subtitle}</p>}
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center pt-8">
            <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
              <ArrowLeft className="w-4 h-4" /> Vai al negozio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return <VolantinoEmptyState />

  return <VolantinoFlyerView data={data} products={products} />
}
