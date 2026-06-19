"use client"

import { useState, useEffect } from 'react'
import { ShoppingBag, Euro, Clock, CheckCircle, TrendingUp, Package } from 'lucide-react'

interface Stats {
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  completedOrders: number
  todayOrders: number
  todayRevenue: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    const res = await fetch('/api/admin/orders')
    const orders = await res.json()

    const today = new Date().toDateString()

    const s: Stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum: number, o: { total: number }) => sum + (o.total || 0), 0),
      pendingOrders: orders.filter((o: { status: string }) => o.status === 'pending').length,
      completedOrders: orders.filter((o: { status: string }) => o.status === 'delivered').length,
      todayOrders: orders.filter((o: { created_at: string }) => new Date(o.created_at).toDateString() === today).length,
      todayRevenue: orders
        .filter((o: { created_at: string }) => new Date(o.created_at).toDateString() === today)
        .reduce((sum: number, o: { total: number }) => sum + (o.total || 0), 0),
    }
    setStats(s)
    setLoading(false)
  }

  if (loading) return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-stone-100 rounded-xl h-20 animate-pulse" />
      ))}
    </div>
  )

  if (!stats) return null

  const cards = [
    { label: 'Ordini totali', value: stats.totalOrders, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600', suffix: '' },
    { label: 'Incasso totale', value: `€${stats.totalRevenue.toFixed(2)}`, icon: Euro, color: 'bg-green-50 text-green-600', suffix: '' },
    { label: 'In attesa', value: stats.pendingOrders, icon: Clock, color: 'bg-yellow-50 text-yellow-600', suffix: '' },
    { label: 'Completati', value: stats.completedOrders, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600', suffix: '' },
    { label: 'Ordini oggi', value: stats.todayOrders, icon: TrendingUp, color: 'bg-purple-50 text-purple-600', suffix: '' },
    { label: 'Incasso oggi', value: `€${stats.todayRevenue.toFixed(2)}`, icon: Package, color: 'bg-amber-50 text-amber-600', suffix: '' },
  ]

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-stone-800">Riepilogo</h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-stone-100 rounded-xl p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-stone-800">{value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
