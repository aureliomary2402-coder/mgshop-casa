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
    addItem(product)
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
          <span className="font-bold text-base" style={{ color: '#0891b2' }}>{priceLabel}</span>
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
