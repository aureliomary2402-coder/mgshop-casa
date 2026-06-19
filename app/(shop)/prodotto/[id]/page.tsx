"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingCart, ImageIcon, ChevronLeft, ChevronRight, Heart, Share2 } from 'lucide-react'
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
  const [liked, setLiked] = useState(false)
  const [addedAnim, setAddedAnim] = useState(false)
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

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-amber-200 border-t-amber-600 animate-spin" />
    </div>
  )
  if (!product) return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-400">Prodotto non trovato</div>
  )

  const allImages = [
    ...(product.cover_image ? [{ id: 'cover', image_url: product.cover_image, product_id: product.id, display_order: -1, created_at: '' }] : []),
    ...images,
  ]

  const handleAddToCart = () => {
    addItem(product)
    setAddedAnim(true)
    setTimeout(() => setAddedAnim(false), 600)
    toast.success(`${product.name} aggiunto al carrello!`, {
      style: { background: '#fef3c7', border: '1px solid #d97706', color: '#92400e' }
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back */}
      <button onClick={() => router.back()}
        className="inline-flex items-center gap-2 mb-8 text-sm font-medium transition-all hover:gap-3 group"
        style={{ color: '#92400e' }}>
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Torna indietro
      </button>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Images */}
        <div>
          <div className="relative aspect-square rounded-3xl overflow-hidden mb-3 group"
            style={{ background: 'linear-gradient(135deg, #faf7f2, #fef3c7)', boxShadow: '0 20px 60px rgba(217,119,6,0.12)' }}>
            {allImages.length > 0 ? (
              <img src={allImages[currentImg].image_url} alt={product.name}
                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-20 h-20" style={{ color: 'rgba(217,119,6,0.3)' }} />
              </div>
            )}

            {allImages.length > 1 && (
              <>
                <button onClick={() => setCurrentImg(i => (i - 1 + allImages.length) % allImages.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press"
                  style={{ background: 'rgba(250,247,242,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <ChevronLeft className="w-5 h-5" style={{ color: '#92400e' }} />
                </button>
                <button onClick={() => setCurrentImg(i => (i + 1) % allImages.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press"
                  style={{ background: 'rgba(250,247,242,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <ChevronRight className="w-5 h-5" style={{ color: '#92400e' }} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {allImages.map((img, i) => (
                <button key={img.id} onClick={() => setCurrentImg(i)}
                  className="w-16 h-16 rounded-xl overflow-hidden shrink-0 transition-all hover:scale-105 btn-press"
                  style={{ border: i === currentImg ? '2px solid #d97706' : '2px solid transparent', boxShadow: i === currentImg ? '0 0 0 3px rgba(217,119,6,0.15)' : 'none' }}>
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5 animate-slide-in-right">
          {product.category && (
            <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(217,119,6,0.1)', color: '#92400e', border: '1px solid rgba(217,119,6,0.2)' }}>
              {product.category.name}
            </span>
          )}

          <h1 className="text-2xl md:text-3xl font-bold leading-tight" style={{ color: '#1a0800' }}>{product.name}</h1>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold" style={{ color: '#d97706' }}>€{product.price.toFixed(2)}</span>
          </div>

          {product.description && (
            <p className="leading-relaxed text-stone-600 border-t border-amber-100 pt-4">{product.description}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-2.5 font-bold py-4 rounded-2xl transition-all hover:scale-[1.02] btn-press text-white"
              style={{
                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                boxShadow: addedAnim ? '0 0 0 6px rgba(217,119,6,0.2)' : '0 8px 24px rgba(217,119,6,0.35)',
                transform: addedAnim ? 'scale(0.97)' : undefined,
                transition: 'all 0.2s ease'
              }}>
              <ShoppingCart className="w-5 h-5" />
              {addedAnim ? 'Aggiunto! ✓' : 'Aggiungi al carrello'}
            </button>

            <button onClick={() => setLiked(l => !l)}
              className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-110 btn-press"
              style={{ background: liked ? 'rgba(239,68,68,0.1)' : 'rgba(217,119,6,0.06)', border: '1px solid', borderColor: liked ? 'rgba(239,68,68,0.2)' : 'rgba(217,119,6,0.15)' }}>
              <Heart className={`w-5 h-5 transition-all ${liked ? 'scale-110' : ''}`} style={{ color: liked ? '#ef4444' : '#d97706', fill: liked ? '#ef4444' : 'none' }} />
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[['🚚', 'Consegna rapida'], ['✅', 'Qualità garantita'], ['💬', 'Supporto WhatsApp'], ['🔒', 'Acquisto sicuro']].map(([icon, label]) => (
              <div key={label} className="flex items-center gap-2 text-xs text-stone-500 rounded-xl p-3"
                style={{ background: 'rgba(217,119,6,0.04)', border: '1px solid rgba(217,119,6,0.08)' }}>
                <span>{icon}</span> {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
