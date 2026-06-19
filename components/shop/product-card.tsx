"use client"

import Link from 'next/link'
import { ImageIcon, ShoppingCart, Eye } from 'lucide-react'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { useCartStore } from '@/lib/cart-store'
import { useState, useRef } from 'react'

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const addItem = useCartStore((state) => state.addItem)
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
    addItem(product)
    toast.success(`${product.name} aggiunto!`, {
      duration: 2000,
      style: { background: '#fef3c7', border: '1px solid #d97706', color: '#92400e' }
    })
  }

  return (
    <div
      ref={cardRef}
      className="group relative rounded-2xl overflow-hidden animate-fade-in-up"
      style={{
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        animationFillMode: 'both',
        background: 'white',
        border: '1px solid rgba(217,119,6,0.08)',
        boxShadow: isHovered
          ? '0 20px 40px rgba(180,100,0,0.15), 0 8px 16px rgba(0,0,0,0.06)'
          : '0 2px 8px rgba(0,0,0,0.04)',
        transform: isHovered
          ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px) scale(1.02)`
          : 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease',
        willChange: 'transform',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setTilt({ x: 0, y: 0 }) }}
    >
      <Link href={`/prodotto/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden" style={{ background: 'linear-gradient(135deg, #faf7f2, #fef3c7)' }}>
          {product.cover_image && !imgError ? (
            <img
              src={product.cover_image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 ease-out"
              style={{ transform: isHovered ? 'scale(1.08)' : 'scale(1)' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10" style={{ color: 'rgba(217,119,6,0.3)' }} />
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 flex items-center justify-center transition-all duration-300"
            style={{ background: isHovered ? 'rgba(26,8,0,0.15)' : 'rgba(26,8,0,0)', backdropFilter: isHovered ? 'blur(1px)' : 'none' }}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300"
              style={{
                background: 'rgba(250,247,242,0.95)',
                color: '#92400e',
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.9)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
              <Eye className="w-3.5 h-3.5" /> Vedi dettagli
            </div>
          </div>

          {/* Shine effect */}
          {isHovered && (
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${(tilt.y / 12 + 0.5) * 100}% ${(tilt.x / 12 + 0.5) * 100}%, rgba(255,255,255,0.15), transparent 60%)`,
              }} />
          )}
        </div>
      </Link>

      <div className="p-3">
        <Link href={`/prodotto/${product.id}`}>
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 leading-snug transition-colors"
            style={{ color: isHovered ? '#92400e' : '#1a0800' }}>
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between">
          <span className="font-bold text-base" style={{ color: '#d97706' }}>€{product.price.toFixed(2)}</span>
          <button
            onClick={handleAddToCart}
            className="flex items-center gap-1 text-white text-xs font-semibold px-3 py-1.5 rounded-full btn-press transition-all"
            style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(217,119,6,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(217,119,6,0.3)')}>
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Aggiungi</span>
          </button>
        </div>
      </div>
    </div>
  )
}
