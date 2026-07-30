"use client"

import { useState, useEffect } from 'react'
import { ShoppingBag, Euro, Clock, CheckCircle, TrendingUp, Package, Gift, Ticket, Radio } from 'lucide-react'
import { PendingFulfillment } from './pending-fulfillment'

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

interface Cliente {
  loyaltyReady?: boolean
}

interface ActiveVisitors {
  count: number
  pages: { page: string; count: number }[]
}

function pageLabel(page: string) {
  const labels: Record<string, string> = {
    '/': 'Home',
    '/shop': 'Negozio',
    '/promo': 'Promo',
    '/carrello': 'Carrello',
  }
  if (labels[page]) return labels[page]
  if (page.startsWith('/prodotto/')) return 'Scheda prodotto'
  return page
}

export function DashboardStats() {
  const [orders, setOrders] = useState<OrderStats | null>(null)
  const [tickets, setTickets] = useState<TicketStats | null>(null)
  const [loyaltyReadyCount, setLoyaltyReadyCount] = useState<number | null>(null)
  const [activeVisitors, setActiveVisitors] = useState<ActiveVisitors | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActive = () => {
      fetch('/api/admin/active-visitors').then(r => r.json()).then(setActiveVisitors).catch(() => {})
    }
    fetchActive()
    const interval = setInterval(fetchActive, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/orders').then(r => r.json()),
      fetch('/api/admin/clienti').then(r => r.json()),
      fetch('/api/admin/lottery/purchases').then(r => r.json()),
    ]).then(([ordersData, clientiData, ticketData]) => {
      const ticketGroups = ticketData.purchases || []
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
      setLoyaltyReadyCount((clientiData as Cliente[]).filter(c => c.loyaltyReady).length)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="bg-slate-100 rounded-xl h-24 animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Visitatori in tempo reale */}
      <div className="rounded-xl p-4 shadow-sm text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0c2b36,#0891b2)' }}>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative w-3 h-3">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />
              <span className="absolute inset-0 rounded-full bg-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{activeVisitors?.count ?? 0}</p>
              <p className="text-xs text-cyan-100 mt-1 flex items-center gap-1">
                <Radio className="w-3 h-3" /> {activeVisitors?.count === 1 ? 'persona online ora' : 'persone online ora'}
              </p>
            </div>
          </div>
          {activeVisitors && activeVisitors.pages.length > 0 && (
            <div className="text-right space-y-0.5">
              {activeVisitors.pages.slice(0, 3).map(p => (
                <p key={p.page} className="text-xs text-cyan-100">{pageLabel(p.page)} · <span className="font-semibold text-white">{p.count}</span></p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Da consegnare e incassare */}
      <PendingFulfillment />

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
