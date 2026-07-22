#!/bin/bash
set -e

# Esegui questo script dalla cartella del repo (cd ~/mgshop)

mkdir -p "lib"
cat > "lib/lottery-ticket-product.ts" << 'CARTEOF'
import type { Product } from './types'

// ID fisso e riconoscibile: sia il carrello sia il checkout lo usano per
// distinguere "un biglietto della lotteria" da un prodotto vero, senza
// bisogno che esista davvero nella tabella products.
export const LOTTERY_TICKET_PRODUCT_ID = 'lottery-ticket'

export function createLotteryTicketProduct(price = 1): Product {
  const now = new Date().toISOString()
  return {
    id: LOTTERY_TICKET_PRODUCT_ID,
    name: 'Biglietto Lotteria',
    description: 'Un numero per partecipare all\u2019estrazione in corso.',
    price,
    category_id: null,
    cover_image: null,
    is_active: true,
    stock: null,
    created_at: now,
    updated_at: now,
  }
}
CARTEOF

mkdir -p "components/shop"
cat > "components/shop/lottery-ticket-card.tsx" << 'CARTEOF'
"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Gift, Minus, Plus, Ticket, ShoppingCart } from 'lucide-react'
import { AmbientBubbles } from './ambient-bubbles'
import { useCartStore } from '@/lib/cart-store'
import { createLotteryTicketProduct, LOTTERY_TICKET_PRODUCT_ID } from '@/lib/lottery-ticket-product'
import { toast } from 'sonner'

interface LotteryData {
  is_active: boolean
  title?: string
  prize_label?: string
}

const TICKET_PRICE = 1

export function LotteryTicketCard() {
  const [data, setData] = useState<LotteryData | null>(null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const items = useCartStore(s => s.items)
  const addItem = useCartStore(s => s.addItem)
  const updateQuantity = useCartStore(s => s.updateQuantity)

  useEffect(() => {
    fetch('/api/lottery', { cache: 'no-store' }).then(r => r.json()).then(d => setData(d)).catch(() => {})
  }, [])

  if (!data || !data.is_active) return null

  const inCart = items.find(i => i.product.id === LOTTERY_TICKET_PRODUCT_ID)?.quantity || 0

  const handleAdd = () => {
    const ticket = createLotteryTicketProduct(TICKET_PRICE)
    const existing = items.find(i => i.product.id === LOTTERY_TICKET_PRODUCT_ID)
    if (existing) {
      updateQuantity(LOTTERY_TICKET_PRODUCT_ID, existing.quantity + qty)
    } else {
      addItem(ticket)
      if (qty > 1) updateQuantity(LOTTERY_TICKET_PRODUCT_ID, qty)
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
    toast.success(`${qty} bigliett${qty > 1 ? 'i' : 'o'} aggiunt${qty > 1 ? 'i' : 'o'} al carrello!`)
    setQty(1)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl neon-glow"
      style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)', border: '1px solid rgba(249,115,22,0.25)' }}>
      <AmbientBubbles count={4} theme="light" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 px-5 py-5 sm:px-7 sm:py-6">
        <div className="shrink-0 animate-float">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 30% 25%, #fde68a, #f59e0b 55%, #c2410c 100%)',
              boxShadow: 'inset -3px -4px 8px rgba(0,0,0,0.25), inset 3px 4px 7px rgba(255,255,255,0.5), 0 8px 18px rgba(249,115,22,0.35)',
            }}>
            <Gift className="w-6 h-6 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wider text-orange-600 uppercase">Lotteria a premi</p>
          <p className="text-base font-bold text-slate-900 mb-1">{data.title || 'Partecipa e vinci'}</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {data.prize_label && <>In palio: <strong className="text-slate-900">{data.prize_label}</strong>. </>}
            Non vuoi comprare nulla ma vuoi comunque tentare la fortuna? Aggiungi un biglietto al carrello, <strong className="text-slate-900">€{TICKET_PRICE} l'uno</strong> — puoi prenderne quanti vuoi.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-orange-200 px-1">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-orange-600"><Minus className="w-3.5 h-3.5" /></button>
              <span className="w-6 text-center font-bold text-slate-800">{qty}</span>
              <button onClick={() => setQty(q => Math.min(20, q + 1))} className="w-8 h-8 flex items-center justify-center text-orange-600"><Plus className="w-3.5 h-3.5" /></button>
            </div>

            <button onClick={handleAdd}
              className="inline-flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl transition-transform hover:scale-105 active:scale-95"
              style={{ background: added ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>
              {added ? <><Ticket className="w-4 h-4" /> Aggiunto!</> : <><ShoppingCart className="w-4 h-4" /> Aggiungi al carrello (€{(qty * TICKET_PRICE).toFixed(2)})</>}
            </button>

            {inCart > 0 && (
              <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                {inCart} nel carrello
              </span>
            )}
          </div>

          <Link href="/lotteria" className="block mt-2.5 text-xs text-orange-500 hover:text-orange-600 underline underline-offset-2">
            Vedi tutti i dettagli della lotteria
          </Link>
        </div>
      </div>
    </div>
  )
}
CARTEOF

mkdir -p "app/api/checkout"
cat > "app/api/checkout/route.ts" << 'CARTEOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoArchiveIfExpired } from '@/lib/lottery'
import { LOTTERY_TICKET_PRODUCT_ID } from '@/lib/lottery-ticket-product'

export async function POST(request: NextRequest) {
  try {
    const { phone_number, items, total, coupon_code } = await request.json()
    if (!phone_number || !items || items.length === 0)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const supabase = createAdminClient()

    // Il "biglietto lotteria" è una voce speciale nel carrello: non è un
    // prodotto vero (niente magazzino, niente riga in order_items). Che il
    // cliente compri solo biglietti o li aggiunga insieme ad altri prodotti,
    // il meccanismo di assegnazione dei numeri è sempre lo stesso.
    const ticketItem = items.find((i: { product: { id: string } }) => i.product.id === LOTTERY_TICKET_PRODUCT_ID)
    const ticketQty = ticketItem ? Math.max(0, parseInt(ticketItem.quantity) || 0) : 0
    const realItems = items.filter((i: { product: { id: string } }) => i.product.id !== LOTTERY_TICKET_PRODUCT_ID)

    let lottery: any = null
    if (ticketQty > 0) {
      const { data: lotteryRow } = await supabase.from('lottery').select('*').limit(1).single()
      lottery = lotteryRow ? await autoArchiveIfExpired(supabase, lotteryRow) : null
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ phone_number, total, status: 'pending' })
      .select().single()
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

    let ticketNumbers: number[] = []
    if (ticketQty > 0 && lottery?.is_active && lottery.round_id) {
      const [{ count: orderCount }, { count: existingTicketCount }] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .eq('lottery_round', lottery.round_id).not('lottery_number', 'is', null),
        supabase.from('lottery_tickets').select('id', { count: 'exact', head: true })
          .eq('round_id', lottery.round_id),
      ])
      const start = (orderCount || 0) + (existingTicketCount || 0) + 1
      ticketNumbers = Array.from({ length: ticketQty }, (_, i) => start + i)
      await supabase.from('lottery_tickets').insert(
        ticketNumbers.map(n => ({
          round_id: lottery.round_id,
          lottery_number: n,
          order_id: order.id,
          phone_number,
        }))
      )
    }

    if (realItems.length > 0) {
      const orderItems = realItems.map((item: { product: { id: string; name: string; price: number }; quantity: number }) => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
      }))
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

      // Scala le quantità dal magazzino (solo per i prodotti veri)
      for (const item of realItems) {
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product.id)
          .single()
        if (product && product.stock !== null) {
          const newStock = Math.max(0, product.stock - item.quantity)
          await supabase.from('products').update({ stock: newStock }).eq('id', item.product.id)
        }
      }
    }

    if (coupon_code) {
      const { data: coupon } = await supabase.from('coupons').select('id, uses_count').eq('code', coupon_code).single()
      if (coupon) await supabase.from('coupons').update({ uses_count: coupon.uses_count + 1 }).eq('id', coupon.id)
    }

    // Notifica push
    const itemsCount = realItems.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)
    const notifBody = ticketQty > 0
      ? `${phone_number} — ${itemsCount} articoli + ${ticketQty} bigliett${ticketQty > 1 ? 'i' : 'o'} lotteria — €${total.toFixed(2)}`
      : `${phone_number} — ${itemsCount} articoli — €${total.toFixed(2)}`
    const baseUrl = request.headers.get('origin') || 'https://mgshop-2.vercel.app'
    fetch(`${baseUrl}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Nuovo ordine ricevuto!',
        body: notifBody,
        url: '/mgadmin-panel'
      })
    }).catch(() => {})

    return NextResponse.json({ success: true, order, ticket_numbers: ticketNumbers })
  } catch {
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
CARTEOF

mkdir -p "components/shop"
cat > "components/shop/cart-content.tsx" << 'CARTEOF'
"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, ImageIcon, CheckCircle, ShoppingCart, Tag, X, Gift, MapPin } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { LOTTERY_TICKET_PRODUCT_ID, createLotteryTicketProduct } from '@/lib/lottery-ticket-product'
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
  const [lotteryActive, setLotteryActive] = useState(false)
  const [lotteryPrizeLabel, setLotteryPrizeLabel] = useState('')
  const [ticketQtyToAdd, setTicketQtyToAdd] = useState(1)
  const [ticketNumbers, setTicketNumbers] = useState<number[]>([])

  const items = useCartStore(s => s.items)
  const addItem = useCartStore(s => s.addItem)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const removeItem = useCartStore(s => s.removeItem)
  const clearCart = useCartStore(s => s.clearCart)
  const getTotalPrice = useCartStore(s => s.getTotalPrice)

  const ticketQtyInCart = items.find(i => i.product.id === LOTTERY_TICKET_PRODUCT_ID)?.quantity || 0

  const addLotteryTickets = (qty: number) => {
    const existing = items.find(i => i.product.id === LOTTERY_TICKET_PRODUCT_ID)
    if (existing) updateQuantity(LOTTERY_TICKET_PRODUCT_ID, existing.quantity + qty)
    else {
      addItem(createLotteryTicketProduct(1))
      if (qty > 1) updateQuantity(LOTTERY_TICKET_PRODUCT_ID, qty)
    }
    setTicketQtyToAdd(1)
  }

  useEffect(() => {
    setMounted(true)
    // Carica quali prodotti fanno parte della promo attiva, per calcolare lo sconto solo su quelli quando serve
    fetch('/api/promo', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setPromoProductIds(d?.is_active ? (d.featured_product_ids || []) : []))
      .catch(() => setPromoProductIds([]))
    fetch('/api/lottery', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setLotteryActive(d?.is_active === true); setLotteryPrizeLabel(d?.prize_label || '') })
      .catch(() => {})
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
      const data = await res.json()
      if (data.ticket_numbers?.length) setTicketNumbers(data.ticket_numbers)
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
      {ticketNumbers.length > 0 && (
        <div className="mb-2">
          <p className="text-sm font-bold text-slate-700 mb-2">I tuoi numeri per la lotteria:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {ticketNumbers.map(n => (
              <span key={n} className="px-3 py-1.5 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>#{n}</span>
            ))}
          </div>
        </div>
      )}
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
          {lotteryActive && (
            <div className="p-3 rounded-xl" style={{ background: ticketQtyInCart > 0 ? 'rgba(8,145,178,0.08)' : 'rgba(8,145,178,0.03)', border: '1px solid rgba(8,145,178,0.15)' }}>
              <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#0c2b36' }}><Gift className="w-4 h-4 text-cyan-600" /> Partecipa alla lotteria</span>
              <span className="text-xs text-slate-400 block mt-0.5 mb-2.5">{lotteryPrizeLabel ? `In palio: ${lotteryPrizeLabel}` : 'Ricevi un numero per l\'estrazione'} — €1 a biglietto, puoi prenderne più di uno.</span>

              {ticketQtyInCart > 0 ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQuantity(LOTTERY_TICKET_PRODUCT_ID, ticketQtyInCart - 1)} className="w-7 h-7 rounded-full flex items-center justify-center bg-white" style={{ border: '1px solid rgba(8,145,178,0.2)' }}><Minus className="w-3 h-3 text-cyan-700" /></button>
                  <span className="w-6 text-center text-sm font-bold text-cyan-700">{ticketQtyInCart}</span>
                  <button type="button" onClick={() => updateQuantity(LOTTERY_TICKET_PRODUCT_ID, ticketQtyInCart + 1)} className="w-7 h-7 rounded-full flex items-center justify-center bg-white" style={{ border: '1px solid rgba(8,145,178,0.2)' }}><Plus className="w-3 h-3 text-cyan-700" /></button>
                  <span className="text-xs text-slate-500 ml-1">bigliett{ticketQtyInCart > 1 ? 'i' : 'o'} nel carrello</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white rounded-lg border border-cyan-200 px-1">
                    <button type="button" onClick={() => setTicketQtyToAdd(q => Math.max(1, q - 1))} className="w-7 h-7 flex items-center justify-center text-cyan-700"><Minus className="w-3 h-3" /></button>
                    <span className="w-5 text-center text-sm font-bold text-slate-800">{ticketQtyToAdd}</span>
                    <button type="button" onClick={() => setTicketQtyToAdd(q => Math.min(20, q + 1))} className="w-7 h-7 flex items-center justify-center text-cyan-700"><Plus className="w-3 h-3" /></button>
                  </div>
                  <button type="button" onClick={() => addLotteryTickets(ticketQtyToAdd)}
                    className="text-xs font-bold text-white px-3 py-2 rounded-lg transition-transform hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
                    Aggiungi (€{ticketQtyToAdd.toFixed(2)})
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="border-t border-cyan-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-500"><span>Subtotale</span><span>€{subtotal.toFixed(2)}</span></div>
            {couponData&&discountAmount>0&&<div className="flex justify-between text-sm text-green-600 font-medium"><span>Sconto coupon</span><span>-€{discountAmount.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold pt-1"><span style={{color:'#0c2b36'}}>Totale</span><span className="text-xl" style={{color:'#0891b2'}}>€{total.toFixed(2)}</span></div>
          </div>
          <CodBanner />
          <Link href="/consegne" className="flex items-center justify-center gap-1.5 text-xs text-cyan-700/70 hover:text-cyan-700 transition-colors underline underline-offset-2">
            <MapPin className="w-3.5 h-3.5" /> Vedi le zone di consegna e i relativi costi
          </Link>
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
CARTEOF

mkdir -p "app/shop"
cat > "app/shop/page.tsx" << 'CARTEOF'
import { createAdminClient } from '@/lib/supabase/admin'
import { HeroBanner } from '@/components/shop/hero-banner'
import { ProductGrid } from '@/components/shop/product-grid'
import { LoyaltyBanner } from '@/components/shop/loyalty-banner'
import { LotteryTicketCard } from '@/components/shop/lottery-ticket-card'
import type { Product, Category, Banner } from '@/lib/types'

export const revalidate = 0

const PAGE_SIZE = 30

async function getData(searchParams: { q?: string; categoria?: string }) {
  const supabase = createAdminClient()
  const [{ data: banners }, { data: categories }] = await Promise.all([
    supabase.from('banners').select('*').eq('is_active', true).order('display_order'),
    supabase.from('categories').select('*').order('name'),
  ])
  let query = supabase.from('products').select('*, category:categories(*)', { count: 'exact' }).eq('is_active', true).order('created_at', { ascending: false })
  if (searchParams.categoria) {
    const cat = (categories || []).find((c: Category) => c.slug === searchParams.categoria)
    if (cat) query = query.eq('category_id', cat.id)
  }
  if (searchParams.q) query = query.ilike('name', `%${searchParams.q}%`)

  query = query.range(0, PAGE_SIZE - 1)

  const { data: products, count } = await query
  return { banners: banners || [], products: products || [], categories: categories || [], count: count || 0 }
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string }> }) {
  const params = await searchParams
  const { banners, products, categories, count } = await getData(params)

  return (
    <main>
      <HeroBanner banners={banners as Banner[]} categories={categories as Category[]} />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <LotteryTicketCard />
        <LoyaltyBanner />
        {products.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(8,145,178,0.08)' }}>
              <span className="text-2xl">🔍</span>
            </div>
            <p className="text-lg font-medium text-slate-600">Nessun prodotto trovato</p>
          </div>
        ) : (
          <ProductGrid
            initialProducts={products as Product[]}
            count={count}
            q={params.q}
            categoria={params.categoria}
          />
        )}
      </div>
    </main>
  )
}
CARTEOF

rm -f "app/api/lottery/tickets/route.ts"
rmdir "app/api/lottery/tickets" 2>/dev/null || true

git add -A
git commit -m "feat: biglietti lotteria a quantita libera, sia standalone che al checkout classico"
git push
