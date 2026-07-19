"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag, ShoppingCart, ImageIcon, Newspaper } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { Reveal } from '@/components/shop/reveal'

interface VolantinoItem {
  product_id: string
  sale_price: number
}

interface VolantinoData {
  is_active: boolean
  title: string
  subtitle: string
  items: VolantinoItem[]
}

function FlyerCard({ product, salePrice, index }: { product: Product; salePrice: number; index: number }) {
  const addItem = useCartStore(s => s.addItem)
  const [added, setAdded] = useState(false)
  const hasDiscount = salePrice < product.price
  const percentOff = hasDiscount ? Math.round((1 - salePrice / product.price) * 100) : 0

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
    toast.success(`${product.name} aggiunto!`, { style: { background: '#fef3c7', border: '1px solid #d97706', color: '#92400e' } })
  }

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both', border: '2px solid #1a0800', boxShadow: '4px 4px 0 rgba(26,8,0,0.9)' }}>
      {hasDiscount && percentOff > 0 && (
        <div className="absolute top-0 right-0 z-10 flex items-center justify-center w-14 h-14 rounded-bl-2xl font-extrabold text-white text-sm"
          style={{ background: '#dc2626' }}>
          -{percentOff}%
        </div>
      )}
      <Link href={`/prodotto/${product.id}`}>
        <div className="aspect-square overflow-hidden" style={{ background: 'linear-gradient(135deg,#faf7f2,#fef3c7)' }}>
          {product.cover_image
            ? <img src={product.cover_image} alt={product.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10" style={{ color: 'rgba(217,119,6,0.3)' }} /></div>}
        </div>
      </Link>
      <div className="p-3">
        <Link href={`/prodotto/${product.id}`}>
          <h3 className="font-bold text-sm text-stone-800 line-clamp-2 mb-2 leading-tight">{product.name}</h3>
        </Link>
        <div className="flex items-end justify-between gap-2 mb-2">
          <div>
            {hasDiscount && <p className="text-xs text-stone-400 line-through leading-none mb-0.5">euro{product.price.toFixed(2)}</p>}
            <p className="font-extrabold text-2xl leading-none" style={{ color: '#dc2626' }}>euro{salePrice.toFixed(2)}</p>
          </div>
        </div>
        <button onClick={handleAdd}
          className="w-full flex items-center justify-center gap-1.5 text-white text-xs font-bold py-2.5 rounded-xl transition-all active:scale-95"
          style={{ background: added ? 'linear-gradient(135deg,#16a34a,#22c55e)' : '#1a0800' }}>
          <ShoppingCart className="w-3.5 h-3.5" />
          {added ? 'Aggiunto!' : 'Aggiungi'}
        </button>
      </div>
    </div>
  )
}

export default function VolantinoPage() {
  const [data, setData] = useState<VolantinoData | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const cartCount = useCartStore(s => s.getTotalItems)()

  useEffect(() => {
    fetch('/api/volantino', { cache: 'no-store' })
      .then(r => r.json())
      .then(async d => {
        setData(d)
        if (d.items && d.items.length > 0) {
          const allProducts = await fetch('/api/admin/products').then(r => r.json())
          const ids = d.items.map((i: VolantinoItem) => i.product_id)
          setProducts(allProducts.filter((p: Product) => ids.includes(p.id)))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen" style={{ background: '#faf7f2' }}>
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
        <div className="skeleton h-24 rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-square rounded-2xl" />)}
        </div>
      </div>
    </div>
  )

  if (!data || !data.is_active) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#faf7f2' }}>
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(217,119,6,0.08)', border: '2px dashed rgba(217,119,6,0.2)' }}>
          <Newspaper className="w-12 h-12" style={{ color: 'rgba(217,119,6,0.4)' }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1a0800' }}>Nessun volantino attivo</h1>
        <p className="text-stone-400 mb-8">Torna presto per le nostre offerte!</p>
        <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white" style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
          <ArrowLeft className="w-4 h-4" /> Vai al negozio
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#faf7f2' }}>
      {/* Header stile volantino */}
      <div className="relative overflow-hidden" style={{ background: '#1a0800' }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(251,191,36,0.9) 1px,transparent 1px),linear-gradient(90deg,rgba(251,191,36,0.9) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 text-center">
          <div className="flex items-center justify-between mb-6">
            <Link href="/shop" className="inline-flex items-center gap-2 text-amber-400/60 hover:text-amber-300 text-sm transition-colors"><ArrowLeft className="w-4 h-4" /> Negozio</Link>
            <Link href="/carrello" className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <ShoppingBag className="w-4 h-4" />
              Carrello
              {cartCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 text-black text-xs rounded-full flex items-center justify-center font-bold" style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>{cartCount}</span>}
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-amber-300 text-sm font-bold mb-4" style={{ background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.3)' }}>
            <Newspaper className="w-4 h-4" /> Volantino digitale
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">{data.title || 'Offerte della settimana'}</h1>
          {data.subtitle && <p className="text-lg text-amber-200/60">{data.subtitle}</p>}
        </div>
      </div>

      {/* Griglia prodotti stile volantino */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {products.length > 0 ? (
          <Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 stagger-children">
              {products.map((p, i) => {
                const item = data.items.find(it => it.product_id === p.id)
                return <FlyerCard key={p.id} product={p} salePrice={item ? item.sale_price : p.price} index={i} />
              })}
            </div>
            {cartCount > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-scale-in">
                <Link href="/carrello"
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl text-black font-bold shadow-2xl transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)', boxShadow: '0 16px 40px rgba(217,119,6,0.5)' }}>
                  <ShoppingBag className="w-5 h-5" />
                  Vai al carrello ({cartCount})
                </Link>
              </div>
            )}
          </Reveal>
        ) : (
          <p className="text-center text-stone-400 py-12">Nessun prodotto nel volantino al momento.</p>
        )}

        <div className="text-center py-10">
          <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-2xl text-white" style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)', boxShadow: '0 12px 32px rgba(217,119,6,0.35)' }}>
            <ShoppingBag className="w-5 h-5" /> Vai al negozio completo
          </Link>
        </div>
      </div>
    </div>
  )
}
