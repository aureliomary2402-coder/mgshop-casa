"use client"

import Link from 'next/link'
import { ImageIcon, ShoppingCart, Eye } from 'lucide-react'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { useCartStore } from '@/lib/cart-store'
import { useState } from 'react'

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const addItem = useCartStore((state) => state.addItem)
  const [imgError, setImgError] = useState(false)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem(product)
    toast.success(`${product.name} aggiunto al carrello`, { duration: 2000 })
  }

  return (
    <div
      className="group relative bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden card-3d animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms`, animationFillMode: 'both' }}
    >
      <Link href={`/prodotto/${product.id}`} className="block">
        <div className="relative aspect-square bg-gradient-to-br from-stone-50 to-stone-100 overflow-hidden">
          {product.cover_image && !imgError ? (
            <img
              src={product.cover_image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-stone-300" />
            </div>
          )}
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <div className="bg-white/90 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-700 shadow-lg">
                <Eye className="w-3.5 h-3.5" /> Dettagli
              </div>
            </div>
          </div>
        </div>
      </Link>

      <div className="p-3">
        <Link href={`/prodotto/${product.id}`}>
          <h3 className="font-medium text-sm text-stone-800 line-clamp-2 mb-2 group-hover:text-amber-700 transition-colors leading-snug">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between">
          <span className="font-bold text-amber-700 text-base">€{product.price.toFixed(2)}</span>
          <button
            onClick={handleAddToCart}
            className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-amber-200 btn-press"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Aggiungi</span>
          </button>
        </div>
      </div>
    </div>
  )
}
