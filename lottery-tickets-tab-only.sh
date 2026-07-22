#!/bin/bash
set -e

# Esegui questo script dalla cartella del repo (cd ~/mgshop)

mkdir -p "lib"
cat > "lib/lottery-ticket-product.ts" << 'FINALEOF'
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
FINALEOF

mkdir -p "app/api/lottery"
cat > "app/api/lottery/route.ts" << 'FINALEOF'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoArchiveIfExpired } from '@/lib/lottery'

// Senza questa riga, Next.js mette in cache questa risposta GET la prima volta
// e la serve sempre uguale (congelata) finché non c'è un nuovo deploy.
// Qui invece serve sempre lo stato reale e aggiornato del database.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const supabase = createAdminClient()
  let { data: lottery } = await supabase.from('lottery').select('*').limit(1).single()
  // Se il conto alla rovescia è scaduto, archivia da sola l'estrazione
  // nello storico vincitori (nessun click manuale richiesto).
  if (lottery) lottery = await autoArchiveIfExpired(supabase, lottery)
  const { data: winners } = await supabase.from('lottery_winners').select('*').order('drawn_at', { ascending: false }).limit(30)

  if (!lottery) {
    return NextResponse.json({ is_active: false, winners: winners || [] })
  }

  const revealed = !!lottery.ends_at && new Date(lottery.ends_at).getTime() <= Date.now()

  return NextResponse.json({
    is_active: lottery.is_active,
    title: lottery.title,
    description: lottery.description,
    image_url: lottery.image_url,
    prize_label: lottery.prize_label,
    participants_count: lottery.participants_count,
    ends_at: lottery.ends_at,
    revealed,
    winner_number: revealed ? lottery.winner_number : null,
    winners: winners || [],
  })
}
FINALEOF

mkdir -p "app/api/checkout"
cat > "app/api/checkout/route.ts" << 'FINALEOF'
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
      .insert({ phone_number, total, status: 'pending', is_ticket_only: realItems.length === 0 })
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
FINALEOF

mkdir -p "app/api/admin/orders"
cat > "app/api/admin/orders/route.ts" << 'FINALEOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { sendPushToAdmin } from '@/lib/push'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

function normalizePhone(phone: string): string {
  let n = phone.replace(/\D/g, '')
  const prefixes = ['0039', '0044', '0033', '0049', '0034', '001']
  for (const p of prefixes) {
    if (n.startsWith(p)) { n = n.slice(p.length); break }
  }
  if (n.startsWith('39') && n.length === 12) n = n.slice(2)
  if (n.startsWith('44') && n.length === 12) n = n.slice(2)
  if (n.startsWith('33') && n.length === 11) n = n.slice(2)
  if (n.startsWith('49') && n.length === 12) n = n.slice(2)
  if (n.startsWith('34') && n.length === 11) n = n.slice(2)
  if (n.startsWith('1') && n.length === 11) n = n.slice(1)
  if (n.length > 10) n = n.slice(-10)
  return n
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('is_ticket_only', false)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()

  // Leggo lo stato precedente prima di aggiornare, per sapere se sto per assegnare punti nuovi
  const { data: before } = await supabase.from('orders').select('status').eq('id', body.id).single()
  const wasAlreadyDelivered = before?.status === 'delivered'

  const updateData: Record<string, string> = {}
  if (body.status !== undefined) updateData.status = body.status
  if (body.customer_name !== undefined) updateData.customer_name = body.customer_name
  const { data, error } = await supabase.from('orders').update(updateData).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Il trigger DB che assegna i punti gira DOPO questo update (in una scrittura separata sulla riga),
  // quindi "data.points_earned" qui sopra è ancora quello vecchio: rileggo l'ordine per prendere il valore aggiornato
  let pointsJustAwarded = 0
  if (updateData.status === 'delivered' && !wasAlreadyDelivered) {
    const { data: refreshed } = await supabase.from('orders').select('points_earned').eq('id', body.id).single()
    pointsJustAwarded = refreshed?.points_earned || 0
  }

  // Se l'ordine è appena passato a "delivered" ORA (non lo era già), il trigger del DB ha assegnato i punti:
  // avviso subito l'admin di quanti punti sono stati dati per questo ordine
  if (updateData.status === 'delivered' && !wasAlreadyDelivered && pointsJustAwarded > 0) {
    try {
      await sendPushToAdmin(
        '🎁 Punti fedeltà assegnati',
        `${data.customer_name || data.phone_number}: +${pointsJustAwarded} punti per l'ordine da €${Number(data.total).toFixed(2)}`,
        '/mgadmin-panel'
      )
    } catch (e) {
      console.error('Notifica punti assegnati fallita:', e)
    }
  }

  // Se l'ordine è appena passato a "delivered", controlla se il cliente ha raggiunto la soglia punti fedeltà
  if (updateData.status === 'delivered' && data?.phone_number) {
    try {
      const normalized = normalizePhone(data.phone_number)

      const { data: pointsRows } = await supabase
        .from('loyalty_points')
        .select('points')
        .eq('phone_normalized', normalized)
      const total = (pointsRows || []).reduce((s, r) => s + (r.points || 0), 0)

      const { data: settingsRows } = await supabase
        .from('loyalty_settings')
        .select('points_threshold')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
      const threshold = settingsRows?.[0]?.points_threshold ?? 10

      if (total >= threshold) {
        await sendPushToAdmin(
          '🎁 Cliente pronto per il premio',
          `${data.customer_name || data.phone_number} ha raggiunto ${total} punti fedeltà`,
          '/mgadmin-panel'
        )
      }
    } catch (e) {
      console.error('Notifica soglia punti fallita:', e)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
FINALEOF

mkdir -p "app/api/admin/lottery/purchases"
cat > "app/api/admin/lottery/purchases/route.ts" << 'FINALEOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

// Ordini che contengono SOLO biglietti della lotteria (nessun prodotto vero):
// vivono qui, separati dagli ordini normali, con i numeri assegnati a ciascuno.
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, phone_number, customer_name, total, status, created_at')
    .eq('is_ticket_only', true)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!orders || orders.length === 0) return NextResponse.json([])

  const orderIds = orders.map(o => o.id)
  const { data: tickets } = await supabase
    .from('lottery_tickets')
    .select('order_id, lottery_number')
    .in('order_id', orderIds)

  const numbersByOrder: Record<string, number[]> = {}
  for (const t of tickets || []) {
    if (!numbersByOrder[t.order_id]) numbersByOrder[t.order_id] = []
    numbersByOrder[t.order_id].push(t.lottery_number)
  }

  const result = orders.map(o => ({
    ...o,
    numbers: (numbersByOrder[o.id] || []).sort((a, b) => a - b),
  }))

  return NextResponse.json(result)
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()

  const updateData: Record<string, string> = {}
  if (body.status !== undefined) updateData.status = body.status
  if (body.customer_name !== undefined) updateData.customer_name = body.customer_name

  const { data, error } = await supabase.from('orders').update(updateData).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  const supabase = createAdminClient()
  // Elimina l'ordine: i biglietti collegati vengono rimossi in automatico
  // grazie al vincolo "on delete cascade" sulla tabella lottery_tickets.
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
FINALEOF

mkdir -p "components/admin"
cat > "components/admin/lottery-purchases-manager.tsx" << 'FINALEOF'
"use client"

import { useState, useEffect } from 'react'
import { Ticket, Trash2, Pencil, Check, X, User } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pending: 'In attesa', confirmed: 'Confermato', shipped: 'Spedito',
  delivered: 'Consegnato', cancelled: 'Annullato',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-teal-100 text-teal-700', confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface TicketPurchase {
  id: string
  phone_number: string
  customer_name: string | null
  total: number
  status: string
  created_at: string
  numbers: number[]
}

export function LotteryPurchasesManager() {
  const [purchases, setPurchases] = useState<TicketPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => { fetchPurchases() }, [])

  const fetchPurchases = async () => {
    const res = await fetch('/api/admin/lottery/purchases')
    setPurchases(await res.json())
    setLoading(false)
  }

  const handleStatusChange = async (id: string, status: string) => {
    await fetch('/api/admin/lottery/purchases', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    fetchPurchases()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo acquisto di biglietti? I numeri collegati verranno rimossi.')) return
    await fetch('/api/admin/lottery/purchases', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchPurchases()
  }

  const saveName = async (id: string) => {
    await fetch('/api/admin/lottery/purchases', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, customer_name: nameInput.trim() }) })
    setEditingName(null); fetchPurchases()
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800">Biglietti acquistati a parte ({purchases.length})</h2>
        <p className="text-xs text-slate-400 mt-0.5">Acquisti di soli biglietti della lotteria, senza altri prodotti — separati dagli ordini normali.</p>
      </div>

      {purchases.length === 0 && (
        <div className="text-center py-12"><Ticket className="w-10 h-10 mx-auto text-slate-300 mb-2" /><p className="text-slate-400 text-sm">Nessun biglietto acquistato a parte, per ora</p></div>
      )}

      <div className="space-y-2">
        {purchases.map(p => (
          <div key={p.id} className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                {editingName === p.id ? (
                  <div className="flex items-center gap-1">
                    <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(p.id); if (e.key === 'Escape') setEditingName(null) }}
                      placeholder="Nome cliente" autoFocus
                      className="text-sm font-medium border border-amber-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-amber-400" style={{ color: '#0c2b36' }} />
                    <button onClick={() => saveName(p.id)} className="p-1 hover:bg-green-50 rounded-lg"><Check className="w-4 h-4 text-green-500" /></button>
                    <button onClick={() => setEditingName(null)} className="p-1 hover:bg-red-50 rounded-lg"><X className="w-4 h-4 text-red-400" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 group/name">
                    <span className="font-medium text-sm text-slate-800">{p.customer_name || p.phone_number}</span>
                    {p.customer_name && <span className="text-xs text-slate-400">{p.phone_number}</span>}
                    <button onClick={() => { setEditingName(p.id); setNameInput(p.customer_name || '') }}
                      className="p-0.5 opacity-0 group-hover/name:opacity-100 hover:bg-slate-100 rounded transition-all">
                      <Pencil className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(p.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' · '}€{p.total.toFixed(2)}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-600'}`}>
                {STATUS_LABELS[p.status] || p.status}
              </span>
              <button onClick={() => { setEditingName(p.id); setNameInput(p.customer_name || '') }}
                className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors shrink-0"><User className="w-4 h-4 text-amber-500" /></button>
              <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"><Trash2 className="w-4 h-4 text-red-400" /></button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {p.numbers.map(n => (
                <span key={n} className="px-2.5 py-1 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>#{n}</span>
              ))}
              {p.numbers.length === 0 && <span className="text-xs text-slate-300">Nessun numero (verificare)</span>}
            </div>

            <div className="mt-3">
              <select value={p.status} onChange={e => handleStatusChange(p.id, e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                {Object.entries(STATUS_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
FINALEOF

mkdir -p "components/shop"
cat > "components/shop/cart-content.tsx" << 'FINALEOF'
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
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.error || 'Si è verificato un errore. Riprova.'); setSubmitting(false); return }
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
FINALEOF

mkdir -p "app/mgadmin-panel"
cat > "app/mgadmin-panel/page.tsx" << 'FINALEOF'
"use client"

import { useState, useEffect } from 'react'
import { Package, Tag, Image, ShoppingBag, LogOut, Lock, LayoutDashboard, Megaphone, Ticket, Menu, X, ExternalLink, Users, Gift, MessageCircle, Newspaper, PartyPopper, Hash } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductsManager } from '@/components/admin/products-manager'
import { CategoriesManager } from '@/components/admin/categories-manager'
import { BannersManager } from '@/components/admin/banners-manager'
import { OrdersManager } from '@/components/admin/orders-manager'
import { DashboardStats } from '@/components/admin/dashboard-stats'
import { PromoManager } from '@/components/admin/promo-manager'
import { VolantinoManager } from '@/components/admin/volantino-manager'
import { CouponsManager } from '@/components/admin/coupons-manager'
import { PushNotifications } from '@/components/admin/push-notifications'
import { ClientiManager } from '@/components/admin/clienti-manager'
import { LoyaltySettingsManager } from '@/components/admin/loyalty-settings-manager'
import { ChatManager } from '@/components/admin/chat-manager'
import { LotteryManager } from '@/components/admin/lottery-manager'
import { LotteryPurchasesManager } from '@/components/admin/lottery-purchases-manager'

type Tab = 'dashboard' | 'products' | 'categories' | 'banners' | 'orders' | 'promo' | 'volantino' | 'coupons' | 'clienti' | 'fedelta' | 'chat' | 'lottery' | 'biglietti'
type Group = 'generale' | 'ordini' | 'catalogo'

const GROUP_LABELS: Record<Group, string> = {
  generale: 'Generale',
  ordini: 'Ordini & Clienti',
  catalogo: 'Prodotti & Offerte',
}

const TABS: { id: Tab; label: string; icon: typeof Package; color: string; group: Group }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600 bg-blue-50', group: 'generale' },
  { id: 'orders', label: 'Ordini', icon: ShoppingBag, color: 'text-sky-600 bg-sky-50', group: 'ordini' },
  { id: 'biglietti', label: 'Biglietti', icon: Hash, color: 'text-amber-600 bg-amber-50', group: 'ordini' },
  { id: 'clienti', label: 'Clienti', icon: Users, color: 'text-pink-600 bg-pink-50', group: 'ordini' },
  { id: 'fedelta', label: 'Fedeltà', icon: Gift, color: 'text-teal-600 bg-teal-50', group: 'ordini' },
  { id: 'coupons', label: 'Coupon', icon: Ticket, color: 'text-indigo-600 bg-indigo-50', group: 'ordini' },
  { id: 'chat', label: 'Chat', icon: MessageCircle, color: 'text-teal-600 bg-teal-50', group: 'ordini' },
  { id: 'products', label: 'Prodotti', icon: Package, color: 'text-cyan-600 bg-cyan-50', group: 'catalogo' },
  { id: 'categories', label: 'Categorie', icon: Tag, color: 'text-green-600 bg-green-50', group: 'catalogo' },
  { id: 'banners', label: 'Banner', icon: Image, color: 'text-purple-600 bg-purple-50', group: 'catalogo' },
  { id: 'promo', label: 'Promo', icon: Megaphone, color: 'text-rose-600 bg-rose-50', group: 'catalogo' },
  { id: 'volantino', label: 'Volantino', icon: Newspaper, color: 'text-red-600 bg-red-50', group: 'catalogo' },
  { id: 'lottery', label: 'Lotteria', icon: PartyPopper, color: 'text-amber-600 bg-amber-50', group: 'catalogo' },
]

const GROUP_ORDER: Group[] = ['generale', 'ordini', 'catalogo']

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [checking, setChecking] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatUnread, setChatUnread] = useState(0)

  useEffect(() => {
    if (!authenticated) return
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/admin/chat')
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data)) {
          setChatUnread(data.reduce((s: number, c: { unread: number }) => s + (c.unread || 0), 0))
        }
      } catch {}
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 8000)
    return () => clearInterval(interval)
  }, [authenticated])

  useEffect(() => {
    fetch('/api/admin/auth').then(r => { if (r.ok) setAuthenticated(true); setChecking(false) }).catch(() => setChecking(false))
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    const res = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    if (res.ok) { setAuthenticated(true) } else { setError('Password errata') }
    setLoading(false)
  }

  const handleLogout = async () => { await fetch('/api/admin/auth', { method: 'DELETE' }); setAuthenticated(false) }
  const activeTabInfo = TABS.find(t => t.id === activeTab)!

  if (checking) return <div className="min-h-screen flex items-center justify-center text-slate-400">Caricamento...</div>

  if (!authenticated) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f0fbfd' }}>
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm" style={{ border: '1px solid rgba(8,145,178,0.1)' }}>
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}>
            <Lock className="w-7 h-7 text-white" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-center mb-6" style={{ color: '#0c2b36' }}>Accesso Admin</h1>
        <form onSubmit={handleLogin} className="space-y-3">
          <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700">{loading ? 'Accesso...' : 'Accedi'}</Button>
        </form>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#f0fbfd' }}>
      <div className="bg-white border-b px-4 h-14 flex items-center justify-between sticky top-0 z-40" style={{ borderColor: 'rgba(8,145,178,0.1)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setMenuOpen(v => !v)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cyan-50 transition-colors" style={{ color: '#0891b2' }}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeTabInfo.color}`}>
              <activeTabInfo.icon className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-800">{activeTabInfo.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PushNotifications />
          <Link href="/shop" target="_blank" className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-cyan-50" style={{ color: '#0891b2', border: '1px solid rgba(8,145,178,0.2)' }}>
            <ExternalLink className="w-3.5 h-3.5" /><span className="hidden sm:inline">Negozio</span>
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-lg hover:bg-slate-50">
            <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col animate-slide-in-left">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800">MG<span style={{ color: '#0891b2' }}>Shop</span> Admin</span>
                <button onClick={() => setMenuOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-500" /></button>
              </div>
              <p className="text-xs text-slate-400">Pannello di controllo</p>
            </div>
            <div className="flex-1 p-3 overflow-y-auto">
              {GROUP_ORDER.map(group => (
                <div key={group} className="mb-4 last:mb-0">
                  <p className="px-4 pt-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{GROUP_LABELS[group]}</p>
                  <div className="space-y-1">
                    {TABS.filter(t => t.group === group).map(({ id, label, icon: Icon, color }) => (
                      <button key={id} onClick={() => { setActiveTab(id); setMenuOpen(false) }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === id ? 'bg-cyan-50 text-cyan-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === id ? color : 'bg-slate-100 text-slate-500'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {label}
                        {id === 'chat' && chatUnread > 0 && (
                          <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{chatUnread}</span>
                        )}
                        {activeTab === id && id !== 'chat' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100 space-y-2">
              <Link href="/shop" target="_blank" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-cyan-50" style={{ color: '#0891b2' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(8,145,178,0.1)' }}><ExternalLink className="w-4 h-4" style={{ color: '#0891b2' }} /></div>
                Vai al negozio
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><LogOut className="w-4 h-4 text-red-500" /></div>
                Esci
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <DashboardStats />}
        {activeTab === 'products' && <ProductsManager />}
        {activeTab === 'categories' && <CategoriesManager />}
        {activeTab === 'banners' && <BannersManager />}
        {activeTab === 'orders' && <OrdersManager />}
        {activeTab === 'biglietti' && <LotteryPurchasesManager />}
        {activeTab === 'promo' && <PromoManager />}
        {activeTab === 'volantino' && <VolantinoManager />}
        {activeTab === 'lottery' && <LotteryManager />}
        {activeTab === 'coupons' && <CouponsManager />}
        {activeTab === 'clienti' && <ClientiManager />}
        {activeTab === 'fedelta' && <LoyaltySettingsManager />}
        {activeTab === 'chat' && <ChatManager />}
      </div>
    </div>
  )
}
FINALEOF

git add -A
git commit -m "feat: biglietti separati dagli ordini in una tab dedicata (niente scelta manuale del numero)"
git push
