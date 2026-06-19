"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingCart, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/cart-store'
import { toast } from 'sonner'
import type { Product, ProductImage } from '@/lib/types'

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<ProductImage[]>([])
  const [currentImg, setCurrentImg] = useState(0)
  const [loading, setLoading] = useState(true)
  const addItem = useCartStore(s => s.addItem)

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/products`).then(r => r.json()),
      fetch(`/api/admin/product-images?product_id=${id}`).then(r => r.json()),
    ]).then(([products, imgs]) => {
      const p = products.find((p: Product) => p.id === id)
      setProduct(p || null)
      setImages(imgs)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-400">Caricamento...</div>
  if (!product) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-400">Prodotto non trovato</div>

  const allImages = [
    ...(product.cover_image ? [{ id: 'cover', image_url: product.cover_image, product_id: product.id, display_order: -1, created_at: '' }] : []),
    ...images,
  ]

  const handleAddToCart = () => {
    addItem(product)
    toast.success(`${product.name} aggiunto al carrello`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-800 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Indietro
      </button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="relative aspect-square bg-stone-50 rounded-2xl overflow-hidden">
            {allImages.length > 0 ? (
              <img src={allImages[currentImg].image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-20 h-20 text-stone-300" />
              </div>
            )}
            {allImages.length > 1 && (
              <>
                <button onClick={() => setCurrentImg(i => (i - 1 + allImages.length) % allImages.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentImg(i => (i + 1) % allImages.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {allImages.map((img, i) => (
                <button key={img.id} onClick={() => setCurrentImg(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${i === currentImg ? 'border-amber-500' : 'border-transparent'}`}>
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          {product.category && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">{product.category.name}</span>
          )}
          <h1 className="text-2xl font-bold text-stone-800">{product.name}</h1>
          <p className="text-3xl font-bold text-amber-700">€{product.price.toFixed(2)}</p>
          {product.description && (
            <p className="text-stone-600 leading-relaxed">{product.description}</p>
          )}
          <Button onClick={handleAddToCart} className="w-full bg-amber-600 hover:bg-amber-700 gap-2 h-12 text-base">
            <ShoppingCart className="w-5 h-5" /> Aggiungi al carrello
          </Button>
        </div>
      </div>
    </div>
  )
}
