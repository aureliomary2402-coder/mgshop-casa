"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, ImageIcon, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-400">Caricamento carrello...</div>
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!phone.trim()) { setError('Inserisci il tuo numero di telefono'); return }
    if (items.length === 0) { setError('Il carrello è vuoto'); return }
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
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-stone-800 mb-2">Ordine inviato!</h2>
      <p className="text-stone-500 mb-6">Ti contatteremo al numero fornito per confermare l'ordine.</p>
      <Button asChild className="bg-amber-600 hover:bg-amber-700">
        <Link href="/">Continua a fare shopping</Link>
      </Button>
    </div>
  )

  if (items.length === 0) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <ShoppingBag className="w-16 h-16 text-stone-300 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-stone-700 mb-2">Il carrello è vuoto</h2>
      <p className="text-stone-400 mb-6">Aggiungi qualche prodotto per iniziare.</p>
      <Button asChild className="bg-amber-600 hover:bg-amber-700">
        <Link href="/">Vai ai prodotti</Link>
      </Button>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-800 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Continua lo shopping
      </Link>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Il tuo carrello</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex gap-4 bg-white rounded-xl border border-stone-100 p-4 shadow-sm">
              <div className="w-20 h-20 rounded-lg bg-stone-50 overflow-hidden shrink-0">
                {product.cover_image
                  ? <img src={product.cover_image} alt={product.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-stone-300" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800 truncate">{product.name}</p>
                <p className="text-amber-700 font-bold">€{product.price.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-50">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                  <button onClick={() => updateQuantity(product.id, quantity + 1)} className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-50">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button onClick={() => removeItem(product.id)} className="ml-auto text-stone-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5 h-fit">
          <h2 className="font-bold text-stone-800 mb-4">Riepilogo ordine</h2>
          <div className="flex justify-between text-sm text-stone-600 mb-2">
            <span>Subtotale</span><span>€{getTotalPrice().toFixed(2)}</span>
          </div>
          <div className="border-t border-stone-100 my-3" />
          <div className="flex justify-between font-bold text-stone-800 mb-4">
            <span>Totale</span><span className="text-amber-700">€{getTotalPrice().toFixed(2)}</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="tel"
              placeholder="Numero di telefono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border-stone-200"
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full bg-amber-600 hover:bg-amber-700">
              {submitting ? 'Invio in corso...' : 'Invia ordine'}
            </Button>
          </form>
          <p className="text-xs text-stone-400 mt-3 text-center">Ti contatteremo su WhatsApp per confermare</p>
        </div>
      </div>
    </div>
  )
}
