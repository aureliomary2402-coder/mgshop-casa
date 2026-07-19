"use client"

import { useState, useEffect } from 'react'
import { ShoppingBag, Euro, Clock, CheckCircle, TrendingUp, Package, Eye, BarChart2, ArrowUp, ArrowDown, Gift } from 'lucide-react'

interface OrderStats {
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  completedOrders: number
  todayOrders: number
  todayRevenue: number
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
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loyaltyReadyCount, setLoyaltyReadyCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/orders').then(r => r.json()),
      fetch('/api/admin/analytics').then(r => r.json()),
      fetch('/api/admin/clienti').then(r => r.json()),
    ]).then(([ordersData, analyticsData, clientiData]) => {
      const today = new Date().toDateString()
      setOrders({
        totalOrders: ordersData.length,
        totalRevenue: ordersData.reduce((s: number, o: { total: number }) => s + (o.total || 0), 0),
        pendingOrders: ordersData.filter((o: { status: string }) => o.status === 'pending').length,
        completedOrders: ordersData.filter((o: { status: string }) => o.status === 'delivered').length,
        todayOrders: ordersData.filter((o: { created_at: string }) => new Date(o.created_at).toDateString() === today).length,
        todayRevenue: ordersData.filter((o: { created_at: string }) => new Date(o.created_at).toDateString() === today).reduce((s: number, o: { total: number }) => s + (o.total || 0), 0),
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
