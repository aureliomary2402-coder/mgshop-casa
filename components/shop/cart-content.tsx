"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, ImageIcon, CheckCircle, ShoppingCart, Tag, X } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { LoyaltyBanner } from './loyalty-banner'
import { CodBanner } from './cod-banner'

export function CartContent({ scope = 'shop' }: { scope?: string }) {
  const [mounted, setMounted] = useState(false)
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [couponData, setCouponData] = useState<{ discount_percent: number; discount_fixed: number; code: string; scope: string } | null>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [promoProductIds, setPromoProductIds] = useState<string[]>([])

  const items = useCartStore(s => s.items)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const removeItem = useCartStore(s => s.removeItem)
  const clearCart = useCartStore(s => s.clearCart)
  const getTotalPrice = useCartStore(s => s.getTotalPrice)

  useEffect(() => {
    setMounted(true)
    // Carica quali prodotti fanno parte della promo attiva, per calcolare lo sconto solo su quelli quando serve
    fetch('/api/promo', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setPromoProductIds(d?.is_active ? (d.featured_product_ids || []) : []))
      .catch(() => setPromoProductIds([]))
  }, [])

  const subtotal = mounted ? getTotalPrice() : 0
  // Se il coupon vale solo per la promo, lo sconto si calcola solo sui prodotti in promo presenti nel carrello
  const promoSubtotal = items.reduce((sum, i) => promoProductIds.includes(i.product.id) ? sum + i.product.price * i.quantity : sum, 0)
  const discountBase = couponData?.scope === 'promo' ? promoSubtotal : subtotal
  const discountAmount = couponData
    ? couponData.discount_percent > 0
      ? discountBase * couponData.discount_percent / 100
      : Math.min(couponData.discount_fixed, discountBase)
    : 0
  const total = Math.max(0, subtotal - discountAmount)

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true); setCouponError('')
    const res = await fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: couponInput, scope }) })
    const data = await res.json()
    if (res.ok) { setCouponData(data); setCouponCode(couponInput); setCouponInput('') }
    else setCouponError(data.error || 'Coupon non valido')
    setCouponLoading(false)
  }

  const removeCoupon = () => { setCouponData(null); setCouponCode(''); setCouponError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!phone.trim()) { setError('Inserisci il tuo numero di telefono'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone_number: phone, items, total, coupon_code: couponCode || null }) })
      if (!res.ok) throw new Error()
      clearCart(); setSubmitted(true)
    } catch { setError('Si è verificato un errore. Riprova.') }
    finally { setSubmitting(false) }
  }

  if (!mounted) return (
    <div className="max-w-4xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-2xl bg-white border border-slate-100">
            <div className="skeleton w-20 h-20 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="skeleton h-4 w-3/4 rounded-full" />
              <div className="skeleton h-4 w-1/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="skeleton rounded-2xl h-64" />
    </div>
  )

  if (submitted) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center animate-scale-in">
      <div className="relative w-24 h-24 mx-auto mb-6">
        {['#0891b2','#06b6d4','#22d3ee','#16a34a','#ef4444','#3b82f6'].map((color, i) => (
          <div key={i} className="confetti-piece"
            style={{
              left: `${50 + (i % 2 === 0 ? -1 : 1) * (10 + i * 6)}%`,
              top: '10%',
              width: 6, height: 6,
              background: color,
              borderRadius: i % 3 === 0 ? '50%' : '2px',
              animationDelay: `${i * 40}ms`,
            }} />
        ))}
        <div className="w-24 h-24 rounded-full flex items-center justify-center animate-check-pop" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',boxShadow:'0 20px 40px rgba(8,145,178,0.3)'}}>
          <CheckCircle className="w-12 h-12 text-white"/>
        </div>
      </div>
      <h2 className="text-3xl font-bold mb-3" style={{color:'#0c2b36'}}>Ordine inviato!</h2>
      <p className="text-slate-500 mb-2">Ti contatteremo presto su WhatsApp per confermare.</p>
      <p className="text-sm text-cyan-700 font-medium mb-8">🎁 Riceverai i tuoi punti fedeltà via WhatsApp!</p>
      <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white btn-press" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)'}}>
        <ShoppingBag className="w-5 h-5"/> Continua a fare shopping
      </Link>
    </div>
  )

  if (items.length === 0) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center animate-scale-in">
      <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{background:'rgba(8,145,178,0.08)',border:'2px dashed rgba(8,145,178,0.2)'}}>
        <ShoppingCart className="w-12 h-12" style={{color:'rgba(8,145,178,0.4)'}}/>
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{color:'#0c2b36'}}>Il carrello è vuoto</h2>
      <p className="text-slate-400 mb-8">Aggiungi qualche prodotto per iniziare.</p>
      <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white btn-press" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)'}}>Vai ai prodotti</Link>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-medium mb-6 group transition-all hover:gap-3" style={{color:'#155e75'}}>
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform"/> Continua lo shopping
      </Link>
      <h1 className="text-2xl font-bold mb-8" style={{color:'#0c2b36'}}>
        Il tuo carrello <span className="text-base font-normal text-slate-400">({items.length} {items.length===1?'articolo':'articoli'})</span>
      </h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          {items.map(({product,quantity},i) => (
            <div key={product.id} className="flex gap-4 rounded-2xl p-4 animate-fade-in-up"
              style={{animationDelay:`${i*50}ms`,animationFillMode:'both',background:'white',border:'1px solid rgba(8,145,178,0.08)',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0" style={{background:'linear-gradient(135deg,#f0fbfd,#cffafe)'}}>
                {product.cover_image ? <img src={product.cover_image} alt={product.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8" style={{color:'rgba(8,145,178,0.3)'}}/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate mb-1" style={{color:'#0c2b36'}}>{product.name}</p>
                <p className="font-bold" style={{color:'#0891b2'}}>€{product.price.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQuantity(product.id,quantity-1)} className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press" style={{border:'1px solid rgba(8,145,178,0.2)',background:'rgba(8,145,178,0.04)'}}><Minus className="w-3 h-3" style={{color:'#155e75'}}/></button>
                  <span className="w-6 text-center text-sm font-bold" style={{color:'#0c2b36'}}>{quantity}</span>
                  <button onClick={() => updateQuantity(product.id,quantity+1)} className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press" style={{border:'1px solid rgba(8,145,178,0.2)',background:'rgba(8,145,178,0.04)'}}><Plus className="w-3 h-3" style={{color:'#155e75'}}/></button>
                  <button onClick={() => removeItem(product.id)} className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 btn-press" style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.1)'}}><Trash2 className="w-4 h-4 text-red-400"/></button>
                </div>
              </div>
            </div>
          ))}
          {/* Banner fedeltà compact nel carrello */}
          <LoyaltyBanner compact={true} />
        </div>

        <div className="rounded-2xl p-5 h-fit sticky top-20 animate-slide-in-right space-y-4" style={{background:'white',border:'1px solid rgba(8,145,178,0.1)',boxShadow:'0 8px 24px rgba(8,145,178,0.08)'}}>
          <h2 className="font-bold" style={{color:'#0c2b36'}}>Riepilogo ordine</h2>
          <div className="space-y-2">
            {items.map(({product,quantity}) => (
              <div key={product.id} className="flex justify-between text-sm text-slate-500">
                <span className="truncate mr-2">{product.name} ×{quantity}</span>
                <span className="shrink-0">€{(product.price*quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {!couponData ? (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400"/>
                    <input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} onKeyDown={e => e.key==='Enter'&&handleApplyCoupon()} placeholder="Codice coupon"
                      className="w-full h-10 pl-9 pr-3 rounded-xl text-sm font-mono outline-none" style={{background:'rgba(8,145,178,0.05)',border:'1px solid rgba(8,145,178,0.15)',color:'#0c2b36'}}/>
                  </div>
                  <button onClick={handleApplyCoupon} disabled={couponLoading||!couponInput.trim()} className="px-3 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-all hover:scale-105 btn-press" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)'}}>
                    {couponLoading?'...':'Applica'}
                  </button>
                </div>
                {couponError && <p className="text-red-500 text-xs">{couponError}</p>}
              </>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl" style={{background:'rgba(8,145,178,0.06)',border:'1px solid rgba(8,145,178,0.2)'}}>
                <div>
                  <p className="text-sm font-bold text-cyan-700">{couponData.code}</p>
                  <p className="text-xs text-slate-500">{couponData.discount_percent>0?`-${couponData.discount_percent}%`:`-€${couponData.discount_fixed}`}{couponData.scope==='promo' ? ' (solo prodotti in promo)' : ' (tutto il carrello)'}</p>
                  {couponData.scope==='promo' && promoSubtotal===0 && <p className="text-xs text-red-500 mt-1">Nessun prodotto in promo nel carrello: sconto non applicato</p>}
                </div>
                <button onClick={removeCoupon} className="p-1 hover:bg-cyan-100 rounded-lg"><X className="w-4 h-4 text-cyan-600"/></button>
              </div>
            )}
          </div>
          <div className="border-t border-cyan-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-500"><span>Subtotale</span><span>€{subtotal.toFixed(2)}</span></div>
            {couponData&&discountAmount>0&&<div className="flex justify-between text-sm text-green-600 font-medium"><span>Sconto coupon</span><span>-€{discountAmount.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold pt-1"><span style={{color:'#0c2b36'}}>Totale</span><span className="text-xl" style={{color:'#0891b2'}}>€{total.toFixed(2)}</span></div>
          </div>
          <CodBanner />
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="tel" placeholder="Numero di telefono" value={phone} onChange={e=>setPhone(e.target.value)}
              className="w-full h-11 px-4 rounded-xl text-sm outline-none" style={{background:'rgba(8,145,178,0.05)',border:'1px solid rgba(8,145,178,0.15)',color:'#0c2b36'}}/>
            {error&&<p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.02] btn-press disabled:opacity-60" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',boxShadow:'0 8px 20px rgba(8,145,178,0.3)'}}>
              {submitting?'Invio in corso...':'Invia ordine'}
            </button>
          </form>
          <p className="text-xs text-center text-slate-400">Ti contatteremo su WhatsApp per confermare</p>
        </div>
      </div>
    </div>
  )
}
