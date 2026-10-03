"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Newspaper } from 'lucide-react'
import { PageHero } from '@/components/shop/page-hero'
import { useCartStore } from '@/lib/cart-store'
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
  const cartCount = useCartStore(s => s.getTotalItems)()

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
      <div className="min-h-screen bg-[#f0fbfd]">
        <PageHero
          icon={Newspaper}
          iconColor="#2563eb"
          badge={{ icon: Newspaper, text: 'Volantino digitale' }}
          title="Scegli il volantino"
          subtitle="Ci sono più volantini attivi: scegli quello che vuoi sfogliare."
          cart={{ count: cartCount, href: '/carrello' }}
        />
        <div className="mg-page-shell mx-auto max-w-3xl px-4 py-12">
          <div className="space-y-4">
            {list.map(item => (
              <Link key={item.id} href={`/volantino/${item.slug || item.id}`}
                className="group flex items-center gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_15px_50px_rgba(15,23,42,.06)] transition-all duration-500 hover:-translate-y-1 hover:border-cyan-300 hover:shadow-[0_30px_80px_rgba(8,145,178,.20)]">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-50">
                  <Newspaper className="h-6 w-6 text-cyan-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-black tracking-[-.02em] text-slate-950">{item.title || 'Volantino'}</p>
                  {item.subtitle && <p className="truncate text-sm text-slate-600">{item.subtitle}</p>}
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white shadow-[0_8px_20px_rgba(8,145,178,.35)] transition-all duration-500 group-hover:scale-110 group-hover:bg-cyan-500">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </Link>
            ))}
          </div>
          <div className="pt-10 text-center">
            <Link href="/shop" className="group inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-cyan-600 px-7 font-black text-white shadow-[0_12px_32px_rgba(8,145,178,.35)] transition duration-300 hover:-translate-y-1 hover:bg-cyan-500">
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" /> Vai al negozio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return <VolantinoEmptyState />

  return <VolantinoFlyerView data={data} products={products} />
}
