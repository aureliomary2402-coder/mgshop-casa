"use client"
import Image from 'next/image'

import { ImageIcon, ShoppingCart, Eye, Heart } from 'lucide-react'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { useCartStore } from '@/lib/cart-store'
import { useProductDetailStore } from '@/lib/product-detail-store'
import { useWishlistStore } from '@/lib/wishlist-store'
import { useState } from 'react'
import { optimizeImage } from '@/lib/image'
import { TornaPrestoStamp } from './torna-presto-stamp'
import { getMinCustomizedPrice, getMaxCustomizedPrice, normalizeChoices } from '@/lib/customization'

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const addItem = useCartStore((state) => state.addItem)
  const openDetail = useProductDetailStore(s => s.open)
  const isWishlisted = useWishlistStore(s => s.has(product.id))
  const toggleWishlist = useWishlistStore(s => s.toggle)
  const [imgError, setImgError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

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
  const discountPercent = hasDiscount ? Math.round((1 - product.price / product.old_price!) * 100) : 0

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-[28px] border bg-white animate-fade-in-up"
      style={{
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        animationFillMode: 'both',
        borderColor: isHovered ? '#67e8f9' : 'rgba(8,145,178,0.16)',
        boxShadow: isHovered
          ? '0 30px 80px rgba(8,145,178,0.20)'
          : '0 15px 50px rgba(15,23,42,0.06)',
        transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease, border-color 0.3s ease',
      }}
      onClick={() => openDetail(product.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {hasDiscount && discountPercent > 0 && !product.torna_presto && !hasVariablePricing && (
        <div className="absolute left-3 top-3 z-10 flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-black text-white shadow-lg"
          style={{ background: '#dc2626' }}>
          -{discountPercent}%
        </div>
      )}
      <div className="relative aspect-square overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0fbfd, #cffafe)' }}>
        {imgUrl && !imgError ? (
          <Image
            src={imgUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            draggable={false}
            priority={index < 8}
            className="object-cover transition-transform duration-500 ease-out select-none"
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
          style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 8px rgba(5,70,85,0.15)' }}
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

      <div className="p-4">
        <h3 className="mb-3 line-clamp-2 text-sm font-black leading-snug tracking-[-0.01em] transition-colors"
          style={{ color: isHovered ? '#0891b2' : '#164e63' }}>
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="flex items-baseline gap-1.5">
            {hasDiscount && <span className="text-xs text-slate-500 line-through">€{product.old_price!.toFixed(2)}</span>}
            <span className="text-lg font-black tracking-[-0.02em]" style={{ color: hasDiscount ? '#dc2626' : '#0e7490' }}>{priceLabel}</span>
          </span>
          <button
            onClick={handleAddToCart}
            disabled={product.torna_presto}
            className="flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-black btn-press transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed"
            style={product.torna_presto
              ? { background: '#e2e8f0', color: '#475569', boxShadow: 'none' }
              : { background: '#22d3ee', color: '#05212a', boxShadow: '0 10px 25px rgba(34,211,238,0.28)' }}>
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{product.torna_presto ? 'Non disponibile' : product.is_customizable ? 'Personalizza' : 'Aggiungi'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
