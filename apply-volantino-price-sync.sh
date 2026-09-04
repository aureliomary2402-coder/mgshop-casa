#!/bin/bash
set -e

# Esegui questo script dalla cartella del repo (cd ~/mgshop)

mkdir -p "lib"
cat > "lib/types.ts" << 'TYPESEOF'
export interface Category {
  id: string
  name: string
  slug: string
  created_at: string
}

// Una scelta selezionabile dentro un'opzione "a scelta multipla" (es. "Piccola",
// "Grande"...). Il prezzo è facoltativo: se impostato, scegliere quella opzione
// determina il prezzo finale del prodotto al posto del prezzo base. La foto è
// facoltativa: se impostata, sostituisce la foto principale del prodotto
// quando il cliente seleziona quella scelta.
export interface CustomizationChoice {
  value: string
  price?: number
  image_url?: string
}

// Una singola opzione di personalizzazione definita dall'admin sul prodotto
// (es. "Colore" a scelta multipla, oppure "Scritta" a testo libero).
export interface CustomizationOption {
  id: string
  label: string
  type: 'select' | 'text'
  required: boolean
  // Nota: prodotti creati prima di questa modifica possono ancora avere qui
  // un array di semplici stringhe invece che di CustomizationChoice; vanno
  // normalizzati con normalizeChoices() prima di leggerne il prezzo.
  choices?: (CustomizationChoice | string)[]
  placeholder?: string
}

// Scelta del cliente per una singola opzione: teniamo anche l'etichetta e il
// valore "fotografati" al momento dell'acquisto, così l'ordine resta leggibile
// anche se in futuro l'admin cambia o rimuove quell'opzione dal prodotto.
export interface CustomizationSelection {
  option_id: string
  label: string
  value: string
  // Prezzo di questa scelta, solo se l'opzione ne aveva uno impostato: resta
  // "fotografato" sull'ordine anche se in futuro l'admin cambia i prezzi.
  price?: number
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  // Prezzo "normale" prima dello sconto, salvato automaticamente quando il
  // prodotto viene messo in offerta dal volantino: se presente, va mostrato
  // sbarrato accanto al prezzo attuale. Torna a null quando l'offerta finisce.
  old_price?: number | null
  category_id: string | null
  cover_image: string | null
  card_image?: string | null
  is_active: boolean
  stock: number | null
  torna_presto?: boolean
  is_customizable?: boolean
  customization_options?: CustomizationOption[]
  // Testo introduttivo mostrato al cliente sopra le opzioni di
  // personalizzazione (es. "Scrivi il nome da ricamare e scegli il colore
  // della base"). Facoltativo: se vuoto non compare nulla.
  customization_note?: string | null
  created_at: string
  updated_at: string
  category?: Category
}

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  display_order: number
  created_at: string
  // 'video' per i filmati caricati in galleria (mp4/webm/mov...). Le righe
  // già esistenti non hanno questo campo: vanno trattate come immagine.
  media_type?: 'image' | 'video'
}

export interface Banner {
  id: string
  title: string | null
  subtitle: string | null
  image_url: string
  link: string | null
  is_active: boolean
  display_order: number
  created_at: string
}

export interface Order {
  id: string
  phone_number: string
  status: string
  total: number
  customer_name?: string
  created_at: string
  delivery_method?: 'ritiro' | 'consegna'
  delivery_address?: string | null
}

export type CartSource = 'shop' | 'volantino' | 'promo'

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_price: number
  quantity: number
  created_at: string
  customization?: CustomizationSelection[] | null
  is_customized?: boolean
  // Da dove il cliente ha aggiunto questo prodotto al carrello: utile
  // all'admin per ritrovare rapidamente il prodotto giusto tra tanti simili.
  source?: CartSource | null
  // Foto del prodotto "fotografata" al momento dell'ordine: resta valida
  // anche se in seguito il prodotto cambia immagine o viene rimosso.
  product_image?: string | null
}

export interface CartItem {
  product: Product
  quantity: number
  // Presente solo per i prodotti personalizzabili: le scelte fatte dal
  // cliente prima di aggiungere al carrello.
  customization?: CustomizationSelection[]
  // Identificativo della riga nel carrello. Di norma coincide con
  // product.id, ma per i prodotti personalizzati include anche le scelte
  // fatte, così due configurazioni diverse dello stesso prodotto restano
  // righe separate invece di sommarsi.
  lineId?: string
  // Prezzo effettivo di questa riga (già calcolato in base alle scelte di
  // personalizzazione). Se assente, si usa product.price come prima d'ora.
  unitPrice?: number
  // Pagina da cui il cliente ha aggiunto il prodotto al carrello (negozio,
  // volantino o promo): resta salvato sull'ordine per l'admin.
  source?: CartSource
}

export interface ReviewMedia {
  id: string
  review_id: string
  media_url: string
  media_type: 'image' | 'video'
  display_order: number
  created_at: string
}

export interface Review {
  id: string
  customer_name: string
  phone_number?: string | null
  rating: number
  comment: string
  admin_reply?: string | null
  admin_reply_at?: string | null
  created_at: string
  media?: ReviewMedia[]
}
TYPESEOF

mkdir -p "app/api/admin/volantino"
cat > "app/api/admin/volantino/route.ts" << 'VOLANTINOAPIEOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('volantino_page').select('*').limit(1).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

interface VolantinoItem {
  product_id: string
  sale_price: number
}

// Allinea il prezzo del prodotto nel negozio con quello impostato nel
// volantino, così il cliente vede lo stesso prezzo sia che aggiunga il
// prodotto al carrello dal volantino sia che lo aggiunga dal negozio.
async function syncProductPrices(
  supabase: ReturnType<typeof createAdminClient>,
  oldItems: VolantinoItem[],
  newItems: VolantinoItem[]
) {
  const oldMap = new Map(oldItems.map(i => [i.product_id, i.sale_price]))
  const newMap = new Map(newItems.map(i => [i.product_id, i.sale_price]))

  // Prodotti tolti dal volantino: ripristina il prezzo pieno nel negozio.
  for (const productId of oldMap.keys()) {
    if (newMap.has(productId)) continue
    const { data: product } = await supabase.from('products').select('old_price').eq('id', productId).single()
    if (product?.old_price != null) {
      await supabase.from('products').update({ price: product.old_price, old_price: null }).eq('id', productId)
    }
  }

  // Prodotti aggiunti o con prezzo promo modificato: applica il nuovo
  // prezzo anche nel negozio, tenendo da parte il prezzo pieno originale
  // (senza sovrascriverlo se il prodotto era già in offerta).
  for (const [productId, salePrice] of newMap) {
    if (oldMap.get(productId) === salePrice) continue
    const { data: product } = await supabase.from('products').select('price, old_price').eq('id', productId).single()
    if (!product) continue
    const fullPrice = product.old_price != null ? product.old_price : product.price
    await supabase.from('products').update({ price: salePrice, old_price: fullPrice }).eq('id', productId)
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()
  const { data: existing } = await supabase.from('volantino_page').select('id, items').limit(1).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await syncProductPrices(supabase, existing.items || [], body.items || [])
  const { data, error } = await supabase.from('volantino_page').update(body).eq('id', existing.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
VOLANTINOAPIEOF

mkdir -p "components/shop"
cat > "components/shop/product-card.tsx" << 'PRODUCTCARDEOF'
"use client"

import { ImageIcon, ShoppingCart, Eye, Heart } from 'lucide-react'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { useCartStore } from '@/lib/cart-store'
import { useProductDetailStore } from '@/lib/product-detail-store'
import { useWishlistStore } from '@/lib/wishlist-store'
import { useState, useRef } from 'react'
import { optimizeImage } from '@/lib/image'
import { TornaPrestoStamp } from './torna-presto-stamp'
import { getMinCustomizedPrice, getMaxCustomizedPrice, normalizeChoices } from '@/lib/customization'

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const addItem = useCartStore((state) => state.addItem)
  const openDetail = useProductDetailStore(s => s.open)
  const isWishlisted = useWishlistStore(s => s.has(product.id))
  const toggleWishlist = useWishlistStore(s => s.toggle)
  const [imgError, setImgError] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: y * 12, y: x * -12 })
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (product.torna_presto) return
    // I prodotti personalizzabili richiedono delle scelte (colore, testo...)
    // prima di poter finire nel carrello: il tasto rapido apre la scheda
    // invece di aggiungere un prodotto "vuoto" senza personalizzazione.
    if (product.is_customizable) {
      openDetail(product.id)
      return
    }
    addItem(product, undefined, undefined, 'shop')
    toast.success(`${product.name} aggiunto!`, {
      duration: 2000,
      style: { background: '#cffafe', border: '1px solid #0891b2', color: '#155e75' }
    })
  }

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product.id)
    if (!isWishlisted) toast.success('Aggiunto ai preferiti', { duration: 1500 })
  }

  const imgUrl = optimizeImage(product.card_image || product.cover_image, 400)
  // Se almeno un'opzione di personalizzazione ha scelte con prezzo proprio,
  // il prezzo finale dipende da cosa sceglie il cliente: mostriamo "da €X"
  // invece del prezzo fisso.
  const hasVariablePricing = !!product.is_customizable && (product.customization_options || []).some(
    opt => opt.type === 'select' && normalizeChoices(opt.choices).some(c => typeof c.price === 'number')
  )
  const minPrice = hasVariablePricing ? getMinCustomizedPrice(product) : product.price
  const maxPrice = hasVariablePricing ? getMaxCustomizedPrice(product) : product.price
  // Mostriamo un intervallo ("da €X a €Y") invece del solo prezzo minimo:
  // sommare i prezzi minimi di più opzioni può dare un numero fuorviante,
  // mentre l'intervallo comunica chiaramente che il prezzo dipende dalla
  // scelta senza sembrare più alto/basso di quanto sia in realtà.
  const priceLabel = hasVariablePricing
    ? (maxPrice > minPrice ? `da €${minPrice.toFixed(2)} a €${maxPrice.toFixed(2)}` : `€${minPrice.toFixed(2)}`)
    : `€${minPrice.toFixed(2)}`
  // Prodotto in offerta (es. tramite il volantino): mostriamo il prezzo
  // pieno sbarrato accanto a quello attuale, così è chiaro anche nel negozio.
  const hasDiscount = !hasVariablePricing && typeof product.old_price === 'number' && product.old_price > product.price

  return (
    <div
      ref={cardRef}
      className="group relative rounded-2xl overflow-hidden animate-fade-in-up cursor-pointer"
      style={{
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        animationFillMode: 'both',
        background: 'white',
        border: '1px solid rgba(8,145,178,0.08)',
        boxShadow: isHovered
          ? '0 20px 40px rgba(8,145,178,0.15), 0 8px 16px rgba(0,0,0,0.06)'
          : '0 2px 8px rgba(0,0,0,0.04)',
        transform: isHovered
          ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px) scale(1.02)`
          : 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease',
        willChange: 'transform',
      }}
      onClick={() => openDetail(product.id)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setTilt({ x: 0, y: 0 }) }}
    >
      <div className="relative aspect-square overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0fbfd, #cffafe)' }}>
        {imgUrl && !imgError ? (
          <img
            src={imgUrl}
            alt={product.name}
            draggable={false}
            loading={index < 8 ? 'eager' : 'lazy'}
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 ease-out select-none"
            style={{ transform: isHovered ? 'scale(1.08)' : 'scale(1)', filter: product.torna_presto ? 'grayscale(1)' : undefined }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10" style={{ color: 'rgba(8,145,178,0.3)' }} />
          </div>
        )}
        {product.torna_presto && <TornaPrestoStamp />}
        <button onClick={handleToggleWishlist}
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center btn-press transition-all z-10"
          style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
          aria-label="Aggiungi ai preferiti">
          <Heart className="w-4 h-4 transition-all" style={{ color: isWishlisted ? '#ef4444' : '#94a3b8', fill: isWishlisted ? '#ef4444' : 'none' }} />
        </button>
        <div className="absolute inset-0 flex items-center justify-center transition-all duration-300"
          style={{ background: isHovered ? 'rgba(12,43,54,0.15)' : 'rgba(12,43,54,0)' }}>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300"
            style={{
              background: 'rgba(240,251,253,0.95)',
              color: '#155e75',
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.9)',
            }}>
            <Eye className="w-3.5 h-3.5" /> Vedi dettagli
          </div>
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 leading-snug transition-colors"
          style={{ color: isHovered ? '#155e75' : '#0c2b36' }}>
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="flex items-baseline gap-1.5">
            {hasDiscount && <span className="text-xs text-slate-400 line-through">€{product.old_price!.toFixed(2)}</span>}
            <span className="font-bold text-base" style={{ color: hasDiscount ? '#dc2626' : '#0891b2' }}>{priceLabel}</span>
          </span>
          <button
            onClick={handleAddToCart}
            disabled={product.torna_presto}
            className="flex items-center gap-1 text-white text-xs font-semibold px-3 py-1.5 rounded-full btn-press transition-all disabled:cursor-not-allowed"
            style={product.torna_presto
              ? { background: '#94a3b8', boxShadow: 'none' }
              : { background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 2px 8px rgba(8,145,178,0.3)' }}>
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{product.torna_presto ? 'Non disponibile' : product.is_customizable ? 'Personalizza' : 'Aggiungi'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
PRODUCTCARDEOF

mkdir -p "components/shop"
cat > "components/shop/product-detail-modal.tsx" << 'PRODUCTDETAILEOF'
"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X, ShoppingCart, Heart } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useProductDetailStore } from '@/lib/product-detail-store'
import { useWishlistStore } from '@/lib/wishlist-store'
import { useRecentlyViewedStore } from '@/lib/recently-viewed-store'
import { missingRequiredOptions, buildCustomizationSelections, buildCartCombinations, computeCustomizedPrice, getSelectedChoiceImage } from '@/lib/customization'
import { sourceFromPathname } from '@/lib/cart-source'
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
  const pathname = usePathname()
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
  // Prezzo attuale in base alle scelte di personalizzazione fatte finora: se
  // il cliente ha selezionato più varianti insieme (es. 12pz e 24pz), qui
  // sommiamo tutte le righe che verranno create per mostrare il totale reale
  // che sta per aggiungere al carrello.
  const cartCombinations = product && product.is_customizable ? buildCartCombinations(options, customValues) : []
  const displayPrice = product ? (product.is_customizable
    ? (cartCombinations.length > 0
      ? cartCombinations.reduce((sum, combo) => sum + computeCustomizedPrice(product, options, combo), 0)
      : product.price)
    : product.price) : 0
  const multipleSelected = cartCombinations.length > 1
  // Prodotto in offerta (es. tramite il volantino): mostriamo il prezzo
  // pieno sbarrato accanto a quello attuale.
  const hasDiscount = !!product && !product.is_customizable && typeof product.old_price === 'number' && product.old_price > product.price

  const handleAddToCart = () => {
    if (!product || product.torna_presto) return
    const source = sourceFromPathname(pathname)
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
        addItem(product, selections, unitPrice, source)
      })
    } else {
      addItem(product, undefined, undefined, source)
    }
    setAddedAnim(true)
    setTimeout(() => setAddedAnim(false), 600)
    toast.success(multipleSelected ? `${cartCombinations.length} varianti di ${product.name} aggiunte!` : `${product.name} aggiunto!`, { style: { background: '#cffafe', border: '1px solid #0891b2', color: '#155e75' } })
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
                <div className="flex items-baseline gap-2">
                  {hasDiscount && <span className="text-lg text-slate-400 line-through">€{product.old_price!.toFixed(2)}</span>}
                  <p className="text-4xl font-extrabold" style={{ color: hasDiscount ? '#dc2626' : '#0891b2' }}>€{displayPrice.toFixed(2)}</p>
                </div>
                {multipleSelected && (
                  <p className="text-sm -mt-3" style={{ color: '#0891b2' }}>
                    Totale per {cartCombinations.length} varianti selezionate
                  </p>
                )}
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
                    {product.torna_presto ? 'Torna presto' : addedAnim ? 'Aggiunto!' : multipleSelected ? `Aggiungi ${cartCombinations.length} varianti` : 'Aggiungi al carrello'}
                  </button>
                  <button onClick={() => toggleWishlist(product.id)}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-110 btn-press"
                    style={{ background: isWishlisted ? 'rgba(239,68,68,0.1)' : 'rgba(8,145,178,0.06)', border: '1px solid', borderColor: isWishlisted ? 'rgba(239,68,68,0.2)' : 'rgba(8,145,178,0.15)' }}>
                    <Heart className="w-5 h-5" style={{ color: isWishlisted ? '#ef4444' : '#0891b2', fill: isWishlisted ? '#ef4444' : 'none' }} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[['🚚', 'Consegna o ritiro'], ['✅', 'Qualità garantita'], ['💬', 'Supporto WhatsApp'], ['🔒', 'Acquisto sicuro']].map(([icon, label]) => (
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
PRODUCTDETAILEOF

mkdir -p "app/prodotto/[id]"
cat > "app/prodotto/[id]/page.tsx" << 'PRODOTTOPAGEEOF'
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
  // Prodotto in offerta (es. tramite il volantino): mostriamo il prezzo
  // pieno sbarrato accanto a quello attuale.
  const hasDiscount = !product.is_customizable && typeof product.old_price === 'number' && product.old_price > product.price

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
        addItem(product, selections, unitPrice, 'shop')
      })
    } else {
      addItem(product, undefined, undefined, 'shop')
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
            <div className="flex items-baseline gap-2">
              {hasDiscount && <span className="text-lg text-slate-400 line-through">€{product.old_price!.toFixed(2)}</span>}
              <p className="text-4xl font-extrabold" style={{ color: hasDiscount ? '#dc2626' : '#0891b2' }}>€{displayPrice.toFixed(2)}</p>
            </div>
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
              {[['🚚','Consegna o ritiro'],['✅','Qualità garantita'],['💬','Supporto WhatsApp'],['🔒','Acquisto sicuro']].map(([icon,label]) => (
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
PRODOTTOPAGEEOF

mkdir -p "app/volantino"
cat > "app/volantino/page.tsx" << 'VOLANTINOPAGEEOF'
"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag, ShoppingCart, ImageIcon, Newspaper } from 'lucide-react'
import { PageHero } from '@/components/shop/page-hero'
import { useCartStore } from '@/lib/cart-store'
import { useProductDetailStore } from '@/lib/product-detail-store'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { Reveal } from '@/components/shop/reveal'
import { AmbientBubbles } from '@/components/shop/ambient-bubbles'
import { optimizeImage } from '@/lib/image'
import { TornaPrestoStamp } from '@/components/shop/torna-presto-stamp'
import { getMinCustomizedPrice, getMaxCustomizedPrice, normalizeChoices } from '@/lib/customization'

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
  const openDetail = useProductDetailStore(s => s.open)
  const [added, setAdded] = useState(false)
  // Il prezzo "pieno" di riferimento è old_price se il prodotto è già in
  // offerta nel negozio (sincronizzato dal volantino), altrimenti product.price.
  const fullPrice = typeof product.old_price === 'number' ? product.old_price : product.price
  const hasDiscount = salePrice < fullPrice
  const percentOff = hasDiscount ? Math.round((1 - salePrice / fullPrice) * 100) : 0

  // I prodotti personalizzabili (es. con scelte a prezzo variabile) non hanno
  // un prezzo fisso: il tasto rapido deve aprire la scheda per far scegliere
  // l'opzione, esattamente come nella griglia normale del negozio, invece di
  // aggiungere al carrello un prodotto "vuoto" a prezzo 0.
  const hasVariablePricing = !!product.is_customizable && (product.customization_options || []).some(
    opt => opt.type === 'select' && normalizeChoices(opt.choices).some(c => typeof c.price === 'number')
  )

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (product.torna_presto) return
    if (product.is_customizable) {
      openDetail(product.id)
      return
    }
    addItem({ ...product, price: salePrice }, undefined, undefined, 'volantino')
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
    toast.success(`${product.name} aggiunto!`, { style: { background: '#cffafe', border: '1px solid #0891b2', color: '#155e75' } })
  }

  return (
    <div onClick={() => openDetail(product.id)} role="button"
      className="relative bg-white rounded-2xl overflow-hidden animate-fade-in-up cursor-pointer"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both', border: '2px solid #0c2b36', boxShadow: '4px 4px 0 rgba(12,43,54,0.9)' }}>
      {hasDiscount && percentOff > 0 && !product.torna_presto && !hasVariablePricing && (
        <div className="absolute top-0 right-0 z-10 flex items-center justify-center w-14 h-14 rounded-bl-2xl font-extrabold text-white text-sm"
          style={{ background: '#dc2626' }}>
          -{percentOff}%
        </div>
      )}
      <div className="aspect-square overflow-hidden relative" style={{ background: 'linear-gradient(135deg,#f0fbfd,#cffafe)' }}>
        {(product.card_image || product.cover_image)
          ? <img src={optimizeImage(product.card_image || product.cover_image, 400) || product.card_image || product.cover_image || ''} alt={product.name} draggable={false} loading="lazy" decoding="async" className="w-full h-full object-cover select-none" style={product.torna_presto ? { filter: 'grayscale(1)' } : undefined} />
          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10" style={{ color: 'rgba(8,145,178,0.3)' }} /></div>}
        {product.torna_presto && <TornaPrestoStamp />}
      </div>
      <div className="p-3">
        <h3 className="font-bold text-sm text-slate-800 line-clamp-2 mb-2 leading-tight">{product.name}</h3>
        <div className="flex items-end justify-between gap-2 mb-2">
          <div>
            {hasVariablePricing ? (
              <p className="font-extrabold text-lg leading-none" style={{ color: '#dc2626' }}>
                da €{getMinCustomizedPrice(product).toFixed(2)}
              </p>
            ) : (
              <>
                {hasDiscount && <p className="text-xs text-slate-400 line-through leading-none mb-0.5">€{fullPrice.toFixed(2)}</p>}
                <p className="font-extrabold text-2xl leading-none" style={{ color: '#dc2626' }}>€{salePrice.toFixed(2)}</p>
              </>
            )}
          </div>
        </div>
        <button onClick={handleAdd}
          disabled={product.torna_presto}
          className="w-full flex items-center justify-center gap-1.5 text-white text-xs font-bold py-2.5 rounded-xl transition-all active:scale-95 disabled:cursor-not-allowed"
          style={{ background: product.torna_presto ? '#94a3b8' : added ? 'linear-gradient(135deg,#16a34a,#22c55e)' : '#0c2b36' }}>
          <ShoppingCart className="w-3.5 h-3.5" />
          {product.torna_presto ? 'Non disponibile' : hasVariablePricing ? 'Personalizza' : added ? 'Aggiunto!' : 'Aggiungi'}
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#eafbff 0%,#f5fdff 45%,#ffffff 100%)' }}>
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
        <div className="skeleton h-24 rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-square rounded-2xl" />)}
        </div>
      </div>
    </div>
  )

  if (!data || !data.is_active) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(180deg,#eafbff 0%,#f5fdff 45%,#ffffff 100%)' }}>
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(8,145,178,0.08)', border: '2px dashed rgba(8,145,178,0.2)' }}>
          <Newspaper className="w-12 h-12" style={{ color: 'rgba(8,145,178,0.4)' }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#0c2b36' }}>Nessun volantino attivo</h1>
        <p className="text-slate-400 mb-8">Torna presto per le nostre offerte!</p>
        <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
          <ArrowLeft className="w-4 h-4" /> Vai al negozio
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#eafbff 0%,#f5fdff 45%,#ffffff 100%)' }}>
      {/* Header stile volantino */}
      <PageHero
        icon={Newspaper}
        iconColor="#2563eb"
        badge={{ icon: Newspaper, text: 'Volantino digitale' }}
        title={data.title || 'Offerte della settimana'}
        subtitle={data.subtitle}
        cart={{ count: cartCount, href: '/carrello' }}
      />

      {/* Griglia prodotti stile volantino */}
      <div className="relative overflow-hidden">
        <AmbientBubbles count={16} theme="light" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">
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
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold shadow-2xl transition-all hover:scale-105 neon-glow"
                    style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
                    <ShoppingBag className="w-5 h-5" />
                    Vai al carrello ({cartCount})
                  </Link>
                </div>
              )}
            </Reveal>
          ) : (
            <p className="text-center text-slate-400 py-12">Nessun prodotto nel volantino al momento.</p>
          )}

          <div className="text-center py-10">
            <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-2xl text-white" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)', boxShadow: '0 12px 32px rgba(8,145,178,0.35)' }}>
              <ShoppingBag className="w-5 h-5" /> Vai al negozio completo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
VOLANTINOPAGEEOF

mkdir -p "components/admin"
cat > "components/admin/volantino-manager.tsx" << 'VOLANTINOMANAGEREOF'
"use client"

import { useState, useEffect } from 'react'
import { ToggleLeft, ToggleRight, Save, Eye, Plus, X, Search, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Product } from '@/lib/types'

interface VolantinoItem {
  product_id: string
  sale_price: number
}

export function VolantinoManager() {
  const [isActive, setIsActive] = useState(false)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [items, setItems] = useState<VolantinoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/admin/volantino')
      .then(r => r.json())
      .then(d => {
        setIsActive(d.is_active === true)
        setTitle(d.title || '')
        setSubtitle(d.subtitle || '')
        setItems(d.items || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
    fetch('/api/admin/products')
      .then(r => r.json())
      .then(setAllProducts)
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/volantino', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive, title, subtitle, items })
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    else setError('Errore salvataggio')
    setSaving(false)
  }

  const addProduct = (product: Product) => {
    if (items.some(i => i.product_id === product.id)) return
    setItems(prev => [...prev, { product_id: product.id, sale_price: product.price }])
  }

  const removeProduct = (productId: string) => {
    setItems(prev => prev.filter(i => i.product_id !== productId))
    setPriceDrafts(prev => {
      const { [productId]: _, ...rest } = prev
      return rest
    })
  }

  const updateSalePrice = (productId: string, raw: string) => {
    // Normalizza virgola -> punto e tiene solo cifre + un separatore decimale,
    // così il campo non "salta" mentre l'utente sta ancora scrivendo (es. "12," o "12.")
    let cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('')

    setPriceDrafts(prev => ({ ...prev, [productId]: cleaned }))

    const val = parseFloat(cleaned)
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, sale_price: isNaN(val) ? 0 : val } : i))
  }

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const itemProducts = items
    .map(i => ({ item: i, product: allProducts.find(p => p.id === i.product_id) }))
    .filter((x): x is { item: VolantinoItem; product: Product } => !!x.product)

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex items-center justify-between p-4 rounded-2xl border"
        style={{ background: isActive ? 'rgba(8,145,178,0.06)' : 'rgba(0,0,0,0.02)', borderColor: isActive ? 'rgba(8,145,178,0.2)' : 'rgba(0,0,0,0.08)' }}>
        <div>
          <p className="font-semibold text-slate-800">Volantino</p>
          <p className="text-xs mt-0.5">
            {isActive ? <span className="text-cyan-600 font-medium">Attivo — ricordati di salvare!</span> : <span className="text-slate-400">Disattivato — ricordati di salvare!</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <Link href="/volantino" target="_blank" className="flex items-center gap-1.5 text-xs text-cyan-700 font-medium px-3 py-1.5 rounded-lg border border-cyan-200 hover:bg-cyan-50">
              <Eye className="w-3.5 h-3.5" /> Vedi
            </Link>
          )}
          <button onClick={() => setIsActive(v => !v)} className="focus:outline-none hover:scale-110 transition-transform">
            {isActive ? <ToggleRight className="w-10 h-10 text-cyan-600" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
          </button>
        </div>
      </div>

      <div className="p-3 rounded-xl text-xs text-cyan-700 font-medium" style={{ background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.15)' }}>
        Dopo ogni modifica clicca Salva modifiche — il prezzo scontato viene aggiornato anche nel negozio
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Titolo</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. Volantino Offerte" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Sottotitolo</label>
          <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Es. Offerte valide fino ad esaurimento scorte" />
        </div>

        {/* Prodotti nel volantino */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-500">Prodotti nel volantino ({items.length})</label>
            <button onClick={() => setShowProductPicker(v => !v)}
              className="flex items-center gap-1 text-xs text-cyan-700 font-medium px-3 py-1.5 rounded-lg border border-cyan-200 hover:bg-cyan-50 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Aggiungi prodotti
            </button>
          </div>

          {/* Prodotti selezionati con prezzo scontato editabile */}
          {itemProducts.length > 0 && (
            <div className="space-y-2 mb-3">
              {itemProducts.map(({ item, product }) => (
                <div key={product.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-cyan-100 bg-cyan-50">
                  {product.cover_image && <img src={product.cover_image} alt={product.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
                    <p className="text-xs text-slate-400 line-through">€{(product.old_price ?? product.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Tag className="w-3.5 h-3.5 text-red-500" />
                    <Input
                      type="text" inputMode="decimal"
                      value={priceDrafts[product.id] ?? String(item.sale_price)}
                      onChange={e => updateSalePrice(product.id, e.target.value)}
                      className="w-20 h-9 text-sm font-bold text-red-600"
                    />
                  </div>
                  <button onClick={() => removeProduct(product.id)} className="p-1 hover:bg-red-100 rounded-lg transition-colors shrink-0">
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Product picker */}
          {showProductPicker && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="Cerca prodotto..." className="pl-9 h-9 text-sm" />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredProducts.map(p => {
                  const already = items.some(i => i.product_id === p.id)
                  return (
                    <button key={p.id} onClick={() => addProduct(p)} disabled={already}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 ${already ? 'opacity-40' : ''}`}>
                      {p.cover_image
                        ? <img src={p.cover_image} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        : <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                        <p className="text-xs text-cyan-700">€{p.price.toFixed(2)}</p>
                      </div>
                      {already && <span className="text-xs text-slate-400 font-bold shrink-0">Aggiunto</span>}
                    </button>
                  )
                })}
              </div>
              <div className="p-2 border-t border-slate-100">
                <button onClick={() => setShowProductPicker(false)} className="w-full text-sm text-slate-500 py-1">Chiudi</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700 text-base py-6">
        <Save className="w-5 h-5" />
        {saved ? 'Salvato!' : saving ? 'Salvataggio...' : 'Salva modifiche'}
      </Button>
    </div>
  )
}
VOLANTINOMANAGEREOF

cat > "schema.sql" << 'SCHEMAEOF'
-- MGShop Casa - Schema SQL
-- Esegui questo script su Supabase > SQL Editor

-- Categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

-- Products
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  -- Prezzo pieno prima dello sconto, salvato automaticamente quando il
  -- prodotto viene messo in offerta dal volantino (null = nessuna offerta).
  old_price numeric(10,2),
  category_id uuid references categories(id) on delete set null,
  cover_image text,
  card_image text,
  is_active boolean not null default true,
  stock integer,
  torna_presto boolean not null default false,
  -- Prodotti personalizzabili (es. borse su cui il cliente sceglie colore,
  -- dimensione, testo...): il prezzo resta indicativo e viene confermato
  -- via WhatsApp dopo l'ordine in base alle scelte fatte.
  is_customizable boolean not null default false,
  customization_options jsonb not null default '[]'::jsonb,
  customization_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Product images (galleria)
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  display_order integer not null default 0,
  created_at timestamptz default now()
);

-- Banners (slider homepage)
create table banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_url text not null,
  link text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz default now()
);

-- Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  status text not null default 'pending',
  total numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

-- Order items
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  product_price numeric(10,2) not null,
  quantity integer not null default 1,
  -- Scelte di personalizzazione fatte dal cliente (colore, dimensione, testo...)
  customization jsonb,
  is_customized boolean not null default false,
  created_at timestamptz default now()
);

-- RLS: disabilita per uso con service_role key
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table banners enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Policy: lettura pubblica per prodotti, categorie, banners, immagini
create policy "Public read categories" on categories for select using (true);
create policy "Public read products" on products for select using (is_active = true);
create policy "Public read product_images" on product_images for select using (true);
create policy "Public read banners" on banners for select using (is_active = true);

-- Supabase Storage: crea bucket "images" pubblico dalla dashboard
-- Storage > New bucket > nome: images > Public: ON
SCHEMAEOF

echo "Fatto! Ricordati di eseguire anche la modifica al database (vedi messaggio sopra)."
