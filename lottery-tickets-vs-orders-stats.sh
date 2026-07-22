#!/bin/bash
set -e

# Esegui questo script dalla cartella del repo (cd ~/mgshop)

mkdir -p "app/api/admin/orders"
cat > "app/api/admin/orders/route.ts" << 'STATEOF'
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

  // Alcuni di questi ordini hanno anche biglietti lotteria acquistati insieme
  // ai prodotti: quei €1 a biglietto non vanno contati come incasso "prodotti",
  // altrimenti l'incasso ordini risulta gonfiato. Qui calcoliamo quanti
  // biglietti (e quindi quanti € di biglietti) ha ciascun ordine.
  const orderIds = (data || []).map((o: { id: string }) => o.id)
  const ticketCounts: Record<string, number> = {}
  if (orderIds.length > 0) {
    const { data: tickets } = await supabase.from('lottery_tickets').select('order_id').in('order_id', orderIds)
    for (const t of tickets || []) {
      ticketCounts[t.order_id] = (ticketCounts[t.order_id] || 0) + 1
    }
  }
  const withTicketInfo = (data || []).map((o: { id: string }) => ({
    ...o,
    ticket_count: ticketCounts[o.id] || 0,
  }))
  return NextResponse.json(withTicketInfo)
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
STATEOF

mkdir -p "app/api/admin/lottery/purchases"
cat > "app/api/admin/lottery/purchases/route.ts" << 'STATEOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

// Ogni biglietto lotteria venduto compare qui, sia che sia stato acquistato
// da solo (nessun prodotto) sia che sia stato preso insieme ad altri
// prodotti in un ordine normale. I biglietti presi insieme a un ordine
// restano visibili anche nella tab Ordini (perché l'ordine è reale), ma qui
// vengono comunque conteggiati come biglietti, non come incasso prodotti.
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()

  const { data: tickets, error } = await supabase
    .from('lottery_tickets')
    .select('id, order_id, lottery_number, phone_number, customer_name, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!tickets || tickets.length === 0) return NextResponse.json([])

  const orderIds = [...new Set(tickets.map(t => t.order_id).filter(Boolean))] as string[]
  const { data: orders } = orderIds.length > 0
    ? await supabase.from('orders').select('id, status, is_ticket_only, customer_name').in('id', orderIds)
    : { data: [] as any[] }
  const orderById = Object.fromEntries((orders || []).map((o: any) => [o.id, o]))

  // Raggruppo per ordine (o per singolo biglietto, se per qualche motivo
  // non è collegato a un ordine) così un acquisto di più numeri insieme
  // compare come una riga sola con tutti i suoi numeri.
  const groups: Record<string, { order_id: string | null; phone_number: string; customer_name: string | null; created_at: string; numbers: number[]; bundled_with_products: boolean; status: string }> = {}

  for (const t of tickets) {
    const key = t.order_id || `standalone-${t.id}`
    const order = t.order_id ? orderById[t.order_id] : null
    if (!groups[key]) {
      groups[key] = {
        order_id: t.order_id,
        phone_number: t.phone_number,
        customer_name: order?.customer_name ?? t.customer_name,
        created_at: t.created_at,
        numbers: [],
        bundled_with_products: order ? !order.is_ticket_only : false,
        status: order?.status || 'pending',
      }
    }
    groups[key].numbers.push(t.lottery_number)
  }

  const result = Object.entries(groups).map(([key, g]) => ({ id: key, ...g, numbers: g.numbers.sort((a, b) => a - b) }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json(result)
}

// Rinomina/aggiorna stato: valido solo per acquisti di soli biglietti
// (senza altri prodotti) — quelli presi insieme a un ordine si gestiscono
// dalla tab Ordini, per evitare di modificare l'ordine da due posti diversi.
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.order_id) return NextResponse.json({ error: 'Questo biglietto è collegato a un ordine con altri prodotti: gestiscilo dalla tab Ordini' }, { status: 400 })
  const supabase = createAdminClient()

  const { data: order } = await supabase.from('orders').select('is_ticket_only').eq('id', body.order_id).single()
  if (!order?.is_ticket_only) return NextResponse.json({ error: 'Questo biglietto è collegato a un ordine con altri prodotti: gestiscilo dalla tab Ordini' }, { status: 400 })

  const updateData: Record<string, string> = {}
  if (body.status !== undefined) updateData.status = body.status
  if (body.customer_name !== undefined) updateData.customer_name = body.customer_name

  const { data, error } = await supabase.from('orders').update(updateData).eq('id', body.order_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { order_id } = await request.json()
  if (!order_id) return NextResponse.json({ error: 'Questo biglietto è collegato a un ordine con altri prodotti: gestiscilo dalla tab Ordini' }, { status: 400 })
  const supabase = createAdminClient()

  const { data: order } = await supabase.from('orders').select('is_ticket_only').eq('id', order_id).single()
  if (!order?.is_ticket_only) return NextResponse.json({ error: 'Questo biglietto è collegato a un ordine con altri prodotti: gestiscilo dalla tab Ordini' }, { status: 400 })

  // Elimina l'ordine: i biglietti collegati vengono rimossi in automatico
  // grazie al vincolo "on delete cascade" sulla tabella lottery_tickets.
  const { error } = await supabase.from('orders').delete().eq('id', order_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
STATEOF

mkdir -p "components/admin"
cat > "components/admin/lottery-purchases-manager.tsx" << 'STATEOF'
"use client"

import { useState, useEffect } from 'react'
import { Ticket, Trash2, Pencil, Check, X, User, ShoppingBag } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pending: 'In attesa', confirmed: 'Confermato', shipped: 'Spedito',
  delivered: 'Consegnato', cancelled: 'Annullato',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-teal-100 text-teal-700', confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface TicketGroup {
  id: string
  order_id: string | null
  phone_number: string
  customer_name: string | null
  created_at: string
  numbers: number[]
  bundled_with_products: boolean
  status: string
}

export function LotteryPurchasesManager() {
  const [purchases, setPurchases] = useState<TicketGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => { fetchPurchases() }, [])

  const fetchPurchases = async () => {
    const res = await fetch('/api/admin/lottery/purchases')
    setPurchases(await res.json())
    setLoading(false)
  }

  const handleStatusChange = async (orderId: string, status: string) => {
    await fetch('/api/admin/lottery/purchases', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId, status }) })
    fetchPurchases()
  }

  const handleDelete = async (orderId: string) => {
    if (!confirm('Eliminare questo acquisto di biglietti? I numeri collegati verranno rimossi.')) return
    await fetch('/api/admin/lottery/purchases', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId }) })
    fetchPurchases()
  }

  const saveName = async (orderId: string) => {
    await fetch('/api/admin/lottery/purchases', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId, customer_name: nameInput.trim() }) })
    setEditingName(null); fetchPurchases()
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  const totalTickets = purchases.reduce((s, p) => s + p.numbers.length, 0)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800">Biglietti venduti ({totalTickets})</h2>
        <p className="text-xs text-slate-400 mt-0.5">Tutti i biglietti della lotteria, sia acquistati da soli sia insieme ad altri prodotti — €1 l'uno.</p>
      </div>

      {purchases.length === 0 && (
        <div className="text-center py-12"><Ticket className="w-10 h-10 mx-auto text-slate-300 mb-2" /><p className="text-slate-400 text-sm">Nessun biglietto venduto, per ora</p></div>
      )}

      <div className="space-y-2">
        {purchases.map(p => (
          <div key={p.id} className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                {editingName === p.id && p.order_id ? (
                  <div className="flex items-center gap-1">
                    <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(p.order_id!); if (e.key === 'Escape') setEditingName(null) }}
                      placeholder="Nome cliente" autoFocus
                      className="text-sm font-medium border border-amber-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-amber-400" style={{ color: '#0c2b36' }} />
                    <button onClick={() => saveName(p.order_id!)} className="p-1 hover:bg-green-50 rounded-lg"><Check className="w-4 h-4 text-green-500" /></button>
                    <button onClick={() => setEditingName(null)} className="p-1 hover:bg-red-50 rounded-lg"><X className="w-4 h-4 text-red-400" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 group/name">
                    <span className="font-medium text-sm text-slate-800">{p.customer_name || p.phone_number}</span>
                    {p.customer_name && <span className="text-xs text-slate-400">{p.phone_number}</span>}
                    {!p.bundled_with_products && (
                      <button onClick={() => { setEditingName(p.id); setNameInput(p.customer_name || '') }}
                        className="p-0.5 opacity-0 group-hover/name:opacity-100 hover:bg-slate-100 rounded transition-all">
                        <Pencil className="w-3 h-3 text-slate-400" />
                      </button>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(p.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' · '}€{p.numbers.length.toFixed(2)}
                </p>
              </div>

              {p.bundled_with_products ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-cyan-100 text-cyan-700 flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3" /> Con altri prodotti
                </span>
              ) : (
                <>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                  <button onClick={() => { setEditingName(p.id); setNameInput(p.customer_name || '') }}
                    className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors shrink-0"><User className="w-4 h-4 text-amber-500" /></button>
                  <button onClick={() => handleDelete(p.order_id!)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {p.numbers.map(n => (
                <span key={n} className="px-2.5 py-1 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>#{n}</span>
              ))}
            </div>

            {!p.bundled_with_products && (
              <div className="mt-3">
                <select value={p.status} onChange={e => handleStatusChange(p.order_id!, e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
STATEOF

mkdir -p "components/admin"
cat > "components/admin/dashboard-stats.tsx" << 'STATEOF'
"use client"

import { useState, useEffect } from 'react'
import { ShoppingBag, Euro, Clock, CheckCircle, TrendingUp, Package, Eye, BarChart2, ArrowUp, ArrowDown, Gift, Ticket } from 'lucide-react'

interface OrderStats {
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  completedOrders: number
  todayOrders: number
  todayRevenue: number
}

interface TicketStats {
  totalTickets: number
  todayTickets: number
}

interface AnalyticsData {
  total: number
  today: number
  yesterday: number
  last7: number
  last30: number
  topPages: { page: string; count: number }[]
  last7Days: { day: string; count: number }[]
}

interface Cliente {
  loyaltyReady?: boolean
}

function MiniChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-sm transition-all"
            style={{
              height: `${Math.max((d.count / max) * 44, 2)}px`,
              background: i === data.length - 1 ? 'linear-gradient(135deg,#0891b2,#06b6d4)' : 'rgba(8,145,178,0.2)'
            }} />
        </div>
      ))}
    </div>
  )
}

function PageLabel({ page }: { page: string }) {
  const labels: Record<string, string> = {
    '/': 'Home',
    '/shop': 'Negozio',
    '/promo': 'Promo',
    '/carrello': 'Carrello',
  }
  if (labels[page]) return <span>{labels[page]}</span>
  if (page.startsWith('/prodotto/')) return <span>Prodotto</span>
  return <span>{page}</span>
}

export function DashboardStats() {
  const [orders, setOrders] = useState<OrderStats | null>(null)
  const [tickets, setTickets] = useState<TicketStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loyaltyReadyCount, setLoyaltyReadyCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/orders').then(r => r.json()),
      fetch('/api/admin/analytics').then(r => r.json()),
      fetch('/api/admin/clienti').then(r => r.json()),
      fetch('/api/admin/lottery/purchases').then(r => r.json()),
    ]).then(([ordersData, analyticsData, clientiData, ticketGroups]) => {
      const today = new Date().toDateString()
      // Alcuni ordini includono anche biglietti lotteria: quei €1 a biglietto
      // vanno tolti dall'incasso "ordini", perché contati a parte qui sotto.
      const productRevenue = (o: { total: number; ticket_count?: number }) => o.total - (o.ticket_count || 0)
      setOrders({
        totalOrders: ordersData.length,
        totalRevenue: ordersData.reduce((s: number, o: { total: number; ticket_count?: number }) => s + productRevenue(o), 0),
        pendingOrders: ordersData.filter((o: { status: string }) => o.status === 'pending').length,
        completedOrders: ordersData.filter((o: { status: string }) => o.status === 'delivered').length,
        todayOrders: ordersData.filter((o: { created_at: string }) => new Date(o.created_at).toDateString() === today).length,
        todayRevenue: ordersData.filter((o: { created_at: string }) => new Date(o.created_at).toDateString() === today).reduce((s: number, o: { total: number; ticket_count?: number }) => s + productRevenue(o), 0),
      })
      setTickets({
        totalTickets: ticketGroups.reduce((s: number, g: { numbers: number[] }) => s + g.numbers.length, 0),
        todayTickets: ticketGroups
          .filter((g: { created_at: string }) => new Date(g.created_at).toDateString() === today)
          .reduce((s: number, g: { numbers: number[] }) => s + g.numbers.length, 0),
      })
      setAnalytics(analyticsData)
      setLoyaltyReadyCount((clientiData as Cliente[]).filter(c => c.loyaltyReady).length)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="bg-slate-100 rounded-xl h-24 animate-pulse" />)}
    </div>
  )

  const todayVsYesterday = analytics ? analytics.today - analytics.yesterday : 0

  return (
    <div className="space-y-6">

      {/* Visite */}
      <div>
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-600" /> Visite sito
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm col-span-2">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-3xl font-bold text-slate-800">{analytics?.today ?? 0}</p>
                <p className="text-xs text-slate-500 mt-0.5">Visite oggi</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${todayVsYesterday >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                {todayVsYesterday >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {Math.abs(todayVsYesterday)} vs ieri
              </div>
            </div>
            {analytics && <MiniChart data={analytics.last7Days} />}
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              {analytics?.last7Days.map((d, i) => (
                <span key={i}>{new Date(d.day).toLocaleDateString('it-IT', { weekday: 'short' })}</span>
              ))}
            </div>
          </div>
          {[
            { label: 'Ieri', value: analytics?.yesterday ?? 0 },
            { label: '7 giorni', value: analytics?.last7 ?? 0 },
            { label: '30 giorni', value: analytics?.last30 ?? 0 },
            { label: 'Totale', value: analytics?.total ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <p className="text-xl font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Pagine più visitate */}
        {analytics && analytics.topPages.length > 0 && (
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5" /> Pagine più visitate (30gg)
            </p>
            <div className="space-y-2">
              {analytics.topPages.map(({ page, count }) => {
                const pct = Math.round((count / (analytics.topPages[0]?.count || 1)) * 100)
                return (
                  <div key={page} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <PageLabel page={page} />
                      <span className="font-medium text-slate-600">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#0891b2,#06b6d4)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Ordini */}
      <div>
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-cyan-600" /> Riepilogo ordini
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {orders && [
            { label: 'Ordini totali', value: orders.totalOrders, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
            { label: 'Incasso totale', value: `€${orders.totalRevenue.toFixed(2)}`, icon: Euro, color: 'bg-green-50 text-green-600' },
            { label: 'In attesa', value: orders.pendingOrders, icon: Clock, color: 'bg-teal-50 text-teal-600' },
            { label: 'Completati', value: orders.completedOrders, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Ordini oggi', value: orders.todayOrders, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
            { label: 'Incasso oggi', value: `€${orders.todayRevenue.toFixed(2)}`, icon: Package, color: 'bg-cyan-50 text-cyan-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Biglietti lotteria */}
      <div>
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Ticket className="w-4 h-4 text-amber-600" /> Riepilogo biglietti lotteria
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {tickets && [
            { label: 'Biglietti venduti', value: tickets.totalTickets, icon: Ticket, color: 'bg-amber-50 text-amber-600' },
            { label: 'Incasso biglietti', value: `€${tickets.totalTickets.toFixed(2)}`, icon: Euro, color: 'bg-green-50 text-green-600' },
            { label: 'Biglietti oggi', value: tickets.todayTickets, icon: TrendingUp, color: 'bg-orange-50 text-orange-600' },
            { label: 'Incasso oggi', value: `€${tickets.todayTickets.toFixed(2)}`, icon: Package, color: 'bg-cyan-50 text-cyan-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fedeltà */}
      <div>
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-cyan-600" /> Fedeltà
        </h2>
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-800">{loyaltyReadyCount ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {loyaltyReadyCount === 1 ? 'cliente pronto per il premio' : 'clienti pronti per il premio'}
            </p>
          </div>
          {loyaltyReadyCount !== null && loyaltyReadyCount > 0 && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700">
              🎁 Vai alla tab Clienti
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
STATEOF

git add -A
git commit -m "fix: incasso ordini al netto dei biglietti; tab e dashboard biglietti includono anche quelli con altri prodotti"
git push
