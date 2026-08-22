"use client"

import { useState, useEffect } from 'react'
import { X, ShoppingCart, Heart } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useProductDetailStore } from '@/lib/product-detail-store'
import { useWishlistStore } from '@/lib/wishlist-store'
import { useRecentlyViewedStore } from '@/lib/recently-viewed-store'
import { missingRequiredOptions, buildCustomizationSelections, computeCustomizedPrice, getSelectedChoiceImage } from '@/lib/customization'
import { toast } from 'sonner'
import type { Product, ProductImage } from '@/lib/types'
import Link from 'next/link'
import { ProductGallery } from '@/components/shop/product-gallery'
import { ProductCustomizeForm } from '@/components/shop/product-customize-form'

// Stessa scheda prodotto di prima (galleria con zoom, descrizione, aggiungi
// al carrello), ma in un popup invece che in una pagina a parte: si apre
// da qualsiasi card del sito (negozio, volantino, promo, ricerca) senza
// ricaricare la pagina. Montato una sola volta nel layout principale.
export function ProductDetailModal() {
  const openProductId = useProductDetailStore(s => s.openProductId)
  const close = useProductDetailStore(s => s.close)
  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<ProductImage[]>([])
  const [loading, setLoading] = useState(true)
  const [addedAnim, setAddedAnim] = useState(false)
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const addItem = useCartStore(s => s.addItem)
  const isWishlisted = useWishlistStore(s => product ? s.has(product.id) : false)
  const toggleWishlist = useWishlistStore(s => s.toggle)
  const addRecentlyViewed = useRecentlyViewedStore(s => s.add)

  useEffect(() => {
    if (!openProductId) return
    setLoading(true)
    setProduct(null)
    setCustomValues({})
    Promise.all([
      fetch('/api/admin/products').then(r => r.json()),
      fetch(`/api/admin/product-images?product_id=${openProductId}`).then(r => r.json()),
    ]).then(([products, imgs]) => {
      const p = products.find((p: Product) => p.id === openProductId)
      setProduct(p || null)
      setImages(imgs)
      setLoading(false)
      if (p) addRecentlyViewed(p.id)
    }).catch(() => setLoading(false))
  }, [openProductId, addRecentlyViewed])

  // Blocca lo scroll della pagina dietro al popup mentre è aperto
  useEffect(() => {
    if (!openProductId) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [openProductId])

  if (!openProductId) return null

  const allImages = product ? [
    ...(product.cover_image ? [{ id: 'cover', image_url: product.cover_image, product_id: product.id, display_order: -1, created_at: '' }] : []),
    ...images,
  ] : []

  const options = product?.customization_options || []
  // Se il cliente ha scelto una misura/variante con una sua foto, la
  // mostriamo al posto della copertina (resto della galleria invariato).
  const selectedChoiceImage = product ? getSelectedChoiceImage(options, customValues) : null
  const displayImages = selectedChoiceImage
    ? [{ id: 'choice-photo', image_url: selectedChoiceImage, product_id: product?.id || '', display_order: -2, created_at: '' }, ...allImages.slice(1)]
    : allImages
  // Prezzo attuale in base alle scelte di personalizzazione fatte finora
  // (se il prodotto non è personalizzabile, o nessuna scelta ha un prezzo
  // proprio, coincide semplicemente con product.price).
  const displayPrice = product ? (product.is_customizable ? computeCustomizedPrice(product, options, customValues) : product.price) : 0

  const handleAddToCart = () => {
    if (!product || product.torna_presto) return
    if (product.is_customizable) {
      const missing = missingRequiredOptions(options, customValues)
      if (missing.length > 0) {
        toast.error(`Completa prima: ${missing.map(o => o.label).join(', ')}`)
        return
      }
    }
    const selections = product.is_customizable ? buildCustomizationSelections(options, customValues) : undefined
    const unitPrice = product.is_customizable ? computeCustomizedPrice(product, options, customValues) : undefined
    addItem(product, selections, unitPrice)
    setAddedAnim(true)
    setTimeout(() => setAddedAnim(false), 600)
    toast.success(`${product.name} aggiunto!`, { style: { background: '#cffafe', border: '1px solid #0891b2', color: '#155e75' } })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(12,43,54,0.55)' }} onClick={close}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-3xl sm:rounded-3xl rounded-t-3xl overflow-y-auto max-h-[92vh] animate-slide-in-right">
        <div className="sticky top-0 z-10 flex justify-end p-3" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0))' }}>
          <button onClick={close} className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center hover:scale-110 transition-transform">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {loading ? (
          <div className="px-5 sm:px-8 pb-8 -mt-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="skeleton aspect-square rounded-3xl" />
              <div className="space-y-4 pt-2">
                <div className="skeleton h-5 w-28 rounded-full" />
                <div className="skeleton h-8 w-4/5 rounded-lg" />
                <div className="skeleton h-10 w-32 rounded-lg" />
                <div className="skeleton h-4 w-full rounded-full" />
                <div className="skeleton h-14 rounded-2xl" />
              </div>
            </div>
          </div>
        ) : !product ? (
          <div className="px-5 pb-16 -mt-4 text-center">
            <p className="text-slate-400">Prodotto non trovato</p>
          </div>
        ) : (
          <div className="px-5 sm:px-8 pb-8 -mt-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <ProductGallery images={displayImages} productName={product.name} tornaPresto={product.torna_presto} />
              </div>

              <div className="space-y-5 animate-slide-in-right">
                {product.category && (
                  <Link href={`/shop?categoria=${product.category.slug}`} onClick={close}
                    className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
                    style={{ background: 'rgba(8,145,178,0.1)', color: '#155e75', border: '1px solid rgba(8,145,178,0.2)' }}>
                    {product.category.name}
                  </Link>
                )}
                <h1 className="text-2xl md:text-3xl font-bold leading-tight" style={{ color: '#0c2b36' }}>{product.name}</h1>
                <p className="text-4xl font-extrabold" style={{ color: '#0891b2' }}>€{displayPrice.toFixed(2)}</p>
                {product.description && (
                  <p className="leading-relaxed text-slate-600 border-t border-cyan-100 pt-4 whitespace-pre-line">{product.description}</p>
                )}
                {product.is_customizable && (
                  <ProductCustomizeForm
                    options={options}
                    values={customValues}
                    onChange={(id, value) => setCustomValues(v => ({ ...v, [id]: value }))}
                    note={product.customization_note}
                  />
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={handleAddToCart}
                    disabled={product.torna_presto}
                    className="flex-1 flex items-center justify-center gap-2.5 font-bold py-4 rounded-2xl text-white btn-press disabled:cursor-not-allowed"
                    style={product.torna_presto
                      ? { background: '#94a3b8', boxShadow: 'none' }
                      : {
                        background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                        boxShadow: addedAnim ? '0 0 0 6px rgba(8,145,178,0.2)' : '0 8px 24px rgba(8,145,178,0.35)',
                        transform: addedAnim ? 'scale(0.97)' : undefined,
                        transition: 'all 0.2s ease'
                      }}>
                    <ShoppingCart className="w-5 h-5" />
                    {product.torna_presto ? 'Torna presto' : addedAnim ? 'Aggiunto!' : 'Aggiungi al carrello'}
                  </button>
                  <button onClick={() => toggleWishlist(product.id)}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-110 btn-press"
                    style={{ background: isWishlisted ? 'rgba(239,68,68,0.1)' : 'rgba(8,145,178,0.06)', border: '1px solid', borderColor: isWishlisted ? 'rgba(239,68,68,0.2)' : 'rgba(8,145,178,0.15)' }}>
                    <Heart className="w-5 h-5" style={{ color: isWishlisted ? '#ef4444' : '#0891b2', fill: isWishlisted ? '#ef4444' : 'none' }} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[['🚚', 'Consegna rapida'], ['✅', 'Qualità garantita'], ['💬', 'Supporto WhatsApp'], ['🔒', 'Acquisto sicuro']].map(([icon, label]) => (
                    <div key={label} className="flex items-center gap-2 text-xs text-slate-500 rounded-xl p-3"
                      style={{ background: 'rgba(8,145,178,0.04)', border: '1px solid rgba(8,145,178,0.08)' }}>
                      <span>{icon}</span> {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
