"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, ImageIcon, CheckCircle, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'

export function CartContent() {
  const [mounted, setMounted] = useState(false)
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const items = useCartStore((state) => state.items)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clearCart)
  const getTotalPrice = useCartStore((state) => state.getTotalPrice)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-amber-200 border-t-amber-600 animate-spin" />
    </div>
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!phone.trim()) { setError('Inserisci il tuo numero di telefono'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, items, total: getTotalPrice() }),
      })
      if (!res.ok) throw new Error()
      clearCart()
      setSubmitted(true)
    } catch {
      setError('Si è verificato un errore. Riprova.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center animate-scale-in">
      <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 20px 40px rgba(217,119,6,0.3)' }}>
        <CheckCircle className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-3xl font-bold mb-3" style={{ color: '#1a0800' }}>Ordine inviato!</h2>
      <p className="text-stone-500 mb-8">Ti contatteremo presto su WhatsApp per confermare il tuo ordine.</p>
      <Link href="/"
        className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white btn-press"
        style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 8px 24px rgba(217,119,6,0.3)' }}>
        <ShoppingBag className="w-5 h-5" /> Continua a fare shopping
      </Link>
    </div>
  )

  if (items.length === 0) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center animate-scale-in">
      <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: 'rgba(217,119,6,0.08)', border: '2px dashed rgba(217,119,6,0.2)' }}>
        <ShoppingCart className="w-12 h-12" style={{ color: 'rgba(217,119,6,0.4)' }} />
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a0800' }}>Il carrello è vuoto</h2>
      <p className="text-stone-400 mb-8">Aggiungi qualche prodotto per iniziare.</p>
      <Link href="/"
        className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white btn-press"
        style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 8px 24px rgba(217,119,6,0.3)' }}>
        Vai ai prodotti
      </Link>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium mb-6 group transition-all hover:gap-3"
        style={{ color: '#92400e' }}>
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Continua lo shopping
      </Link>

      <h1 className="text-2xl font-bold mb-8" style={{ color: '#1a0800' }}>
        Il tuo carrello <span className="text-base font-normal text-stone-400">({items.length} {items.length === 1 ? 'articolo' : 'articoli'})</span>
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Items */}
        <div className="md:col-span-2 space-y-3">
          {items.map(({ product, quantity }, i) => (
            <div key={product.id}
              className="flex gap-4 rounded-2xl p-4 animate-fade-in-up"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both', background: 'white', border: '1px solid rgba(217,119,6,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0"
                style={{ background: 'linear-gradient(135deg, #faf7f2, #fef3c7)' }}>
                {product.cover_image
                  ? <img src={product.cover_image} alt={product.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8" style={{ color: 'rgba(217,119,6,0.3)' }} /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate mb-1" style={{ color: '#1a0800' }}>{product.name}</p>
                <p className="font-bold" style={{ color: '#d97706' }}>€{product.price.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQuantity(product.id, quantity - 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press"
                    style={{ border: '1px solid rgba(217,119,6,0.2)', background: 'rgba(217,119,6,0.04)' }}>
                    <Minus className="w-3 h-3" style={{ color: '#92400e' }} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold" style={{ color: '#1a0800' }}>{quantity}</span>
                  <button onClick={() => updateQuantity(product.id, quantity + 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press"
                    style={{ border: '1px solid rgba(217,119,6,0.2)', background: 'rgba(217,119,6,0.04)' }}>
                    <Plus className="w-3 h-3" style={{ color: '#92400e' }} />
                  </button>
                  <button onClick={() => removeItem(product.id)}
                    className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 btn-press"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="rounded-2xl p-5 h-fit sticky top-20 animate-slide-in-right"
          style={{ background: 'white', border: '1px solid rgba(217,119,6,0.1)', boxShadow: '0 8px 24px rgba(217,119,6,0.08)' }}>
          <h2 className="font-bold mb-4" style={{ color: '#1a0800' }}>Riepilogo ordine</h2>

          <div className="space-y-2 mb-4">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between text-sm text-stone-500">
                <span className="truncate mr-2">{product.name} ×{quantity}</span>
                <span className="shrink-0">€{(product.price * quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-amber-100 my-3" />
          <div className="flex justify-between font-bold mb-5">
            <span style={{ color: '#1a0800' }}>Totale</span>
            <span className="text-xl" style={{ color: '#d97706' }}>€{getTotalPrice().toFixed(2)}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="tel"
              placeholder="📱 Numero di telefono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-11 px-4 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'rgba(217,119,6,0.05)', border: '1px solid rgba(217,119,6,0.15)', color: '#1a0800' }}
              onFocus={e => e.target.style.borderColor = 'rgba(217,119,6,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(217,119,6,0.15)'}
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.02] btn-press disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 8px 20px rgba(217,119,6,0.3)' }}>
              {submitting ? 'Invio in corso...' : '🚀 Invia ordine'}
            </button>
          </form>
          <p className="text-xs text-center mt-3 text-stone-400">Ti contatteremo su WhatsApp per confermare</p>
        </div>
      </div>
    </div>
  )
}
