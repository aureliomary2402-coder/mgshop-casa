"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingCart, Heart } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useWishlistStore } from '@/lib/wishlist-store'
import { useRecentlyViewedStore } from '@/lib/recently-viewed-store'
import { missingRequiredOptions, buildCustomizationSelections, buildCartCombinations, computeCustomizedPrice, getSelectedChoiceImage } from '@/lib/customization'
import { toast } from 'sonner'
import type { Product, ProductImage } from '@/lib/types'
import Link from 'next/link'
import { ProductGallery } from '@/components/shop/product-gallery'
import { ProductCustomizeForm } from '@/components/shop/product-customize-form'

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<ProductImage[]>([])
  const [loading, setLoading] = useState(true)
  const [addedAnim, setAddedAnim] = useState(false)
  const [customValues, setCustomValues] = useState<Record<string, string | string[]>>({})
  const addItem = useCartStore(s => s.addItem)
  const isWishlisted = useWishlistStore(s => product ? s.has(product.id) : false)
  const toggleWishlist = useWishlistStore(s => s.toggle)
  const addRecentlyViewed = useRecentlyViewedStore(s => s.add)

  useEffect(() => {
    setCustomValues({})
    Promise.all([
      fetch('/api/admin/products').then(r => r.json()),
      fetch(`/api/admin/product-images?product_id=${id}`).then(r => r.json()),
    ]).then(([products, imgs]) => {
      const p = products.find((p: Product) => p.id === id)
      setProduct(p || null)
      setImages(imgs)
      setLoading(false)
      if (p) addRecentlyViewed(p.id)
    })
  }, [id, addRecentlyViewed])

  if (loading) return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#eafbff 0%,#f5fdff 45%,#ffffff 100%)' }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="skeleton h-4 w-24 rounded-full mb-8" />
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <div className="skeleton aspect-square rounded-3xl mb-3" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton w-16 h-16 rounded-xl shrink-0" />)}
            </div>
          </div>
          <div className="space-y-5">
            <div className="skeleton h-5 w-28 rounded-full" />
            <div className="skeleton h-8 w-4/5 rounded-lg" />
            <div className="skeleton h-10 w-32 rounded-lg" />
            <div className="space-y-2 pt-2">
              <div className="skeleton h-4 w-full rounded-full" />
              <div className="skeleton h-4 w-full rounded-full" />
              <div className="skeleton h-4 w-2/3 rounded-full" />
            </div>
            <div className="flex gap-3 pt-2">
              <div className="skeleton h-14 flex-1 rounded-2xl" />
              <div className="skeleton h-14 w-14 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
  if (!product) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg,#eafbff 0%,#f5fdff 45%,#ffffff 100%)' }}>
      <p className="text-slate-400">Prodotto non trovato</p>
    </div>
  )

  const allImages = [
    ...(product.cover_image ? [{ id: 'cover', image_url: product.cover_image, product_id: product.id, display_order: -1, created_at: '' }] : []),
    ...images,
  ]

  const options = product.customization_options || []
  // Se il cliente ha scelto una misura/variante con una sua foto, la
  // mostriamo al posto della copertina (resto della galleria invariato).
  const selectedChoiceImage = getSelectedChoiceImage(options, customValues)
  const displayImages = selectedChoiceImage
    ? [{ id: 'choice-photo', image_url: selectedChoiceImage, product_id: product.id, display_order: -2, created_at: '' }, ...allImages.slice(1)]
    : allImages
  // Prezzo attuale in base alle scelte di personalizzazione fatte finora: se
  // il cliente ha selezionato più varianti insieme (es. 12pz e 24pz), qui
  // sommiamo tutte le righe che verranno create per mostrare il totale reale
  // che sta per aggiungere al carrello.
  const cartCombinations = product.is_customizable ? buildCartCombinations(options, customValues) : []
  const displayPrice = product.is_customizable
    ? (cartCombinations.length > 0
      ? cartCombinations.reduce((sum, combo) => sum + computeCustomizedPrice(product, options, combo), 0)
      : product.price)
    : product.price
  const multipleSelected = cartCombinations.length > 1

  const handleAddToCart = () => {
    if (product.torna_presto) return
    if (product.is_customizable) {
      const missing = missingRequiredOptions(options, customValues)
      if (missing.length > 0) {
        toast.error(`Completa prima: ${missing.map(o => o.label).join(', ')}`)
        return
      }
      const combos = cartCombinations.length > 0 ? cartCombinations : [{}]
      combos.forEach(combo => {
        const selections = buildCustomizationSelections(options, combo)
        const unitPrice = computeCustomizedPrice(product, options, combo)
        addItem(product, selections, unitPrice)
      })
    } else {
      addItem(product)
    }
    setAddedAnim(true)
    setTimeout(() => setAddedAnim(false), 600)
    toast.success(multipleSelected ? `${cartCombinations.length} varianti di ${product.name} aggiunte!` : `${product.name} aggiunto!`, {
      style: { background: '#cffafe', border: '1px solid #0891b2', color: '#155e75' }
    })
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#eafbff 0%,#f5fdff 45%,#ffffff 100%)' }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => router.back()}
          className="inline-flex items-center gap-2 mb-8 text-sm font-medium group transition-all hover:gap-3"
          style={{ color: '#155e75' }}>
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Indietro
        </button>

        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <ProductGallery images={displayImages} productName={product.name} tornaPresto={product.torna_presto} />
          </div>

          <div className="space-y-5 animate-slide-in-right">
            {product.category && (
              <Link href={`/shop?categoria=${product.category.slug}`}
                className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
                style={{ background: 'rgba(8,145,178,0.1)', color: '#155e75', border: '1px solid rgba(8,145,178,0.2)' }}>
                {product.category.name}
              </Link>
            )}
            <h1 className="text-2xl md:text-3xl font-bold leading-tight" style={{ color: '#0c2b36' }}>{product.name}</h1>
            <p className="text-4xl font-extrabold" style={{ color: '#0891b2' }}>€{displayPrice.toFixed(2)}</p>
            {multipleSelected && (
              <p className="text-sm -mt-3" style={{ color: '#0891b2' }}>
                Totale per {cartCombinations.length} varianti selezionate
              </p>
            )}
            {product.description && (
              <p className="leading-relaxed text-slate-600 border-t border-cyan-100 pt-4">{product.description}</p>
            )}
            {product.is_customizable && (
              <ProductCustomizeForm
                options={options}
                values={customValues}
                onChange={(optId, value) => setCustomValues(v => ({ ...v, [optId]: value }))}
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
                {product.torna_presto ? 'Torna presto' : addedAnim ? 'Aggiunto!' : multipleSelected ? `Aggiungi ${cartCombinations.length} varianti` : 'Aggiungi al carrello'}
              </button>
              <button onClick={() => toggleWishlist(product.id)}
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-110 btn-press"
                style={{ background: isWishlisted ? 'rgba(239,68,68,0.1)' : 'rgba(8,145,178,0.06)', border: '1px solid', borderColor: isWishlisted ? 'rgba(239,68,68,0.2)' : 'rgba(8,145,178,0.15)' }}>
                <Heart className="w-5 h-5" style={{ color: isWishlisted ? '#ef4444' : '#0891b2', fill: isWishlisted ? '#ef4444' : 'none' }} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['🚚','Consegna rapida'],['✅','Qualità garantita'],['💬','Supporto WhatsApp'],['🔒','Acquisto sicuro']].map(([icon,label]) => (
                <div key={label} className="flex items-center gap-2 text-xs text-slate-500 rounded-xl p-3"
                  style={{ background: 'rgba(8,145,178,0.04)', border: '1px solid rgba(8,145,178,0.08)' }}>
                  <span>{icon}</span> {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
