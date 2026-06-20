"use client"

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Package, Trash2 } from 'lucide-react'
import type { Order, OrderItem } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  pending: 'In attesa',
  confirmed: 'Confermato',
  shipped: 'Spedito',
  delivered: 'Consegnato',
  cancelled: 'Annullato',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface OrderWithItems extends Order { order_items: OrderItem[] }

export function OrdersManager() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    const res = await fetch('/api/admin/orders')
    setOrders(await res.json())
    setLoading(false)
  }

  const handleStatusChange = async (id: string, status: string) => {
    await fetch('/api/admin/orders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    fetchOrders()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo ordine?')) return
    await fetch('/api/admin/orders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (expanded === id) setExpanded(null)
    fetchOrders()
  }

  if (loading) return <div className="text-center py-8 text-stone-400">Caricamento...</div>

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-stone-800">Ordini ({orders.length})</h2>
      {orders.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-10 h-10 mx-auto text-stone-300 mb-2" />
          <p className="text-stone-400 text-sm">Nessun ordine ancora</p>
        </div>
      )}
      <div className="space-y-2">
        {orders.map(order => (
          <div key={order.id} className="bg-white border border-stone-100 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-stone-800">{order.phone_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-stone-100 text-stone-600'}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  {new Date(order.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' - '}euro{order.total.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => handleDelete(order.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Elimina">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
                <button onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                  {expanded === order.id ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                </button>
              </div>
            </div>
            {expanded === order.id && (
              <div className="border-t border-stone-100 px-4 pb-4 pt-3 space-y-3">
                <div className="space-y-1">
                  {order.order_items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-stone-700">{item.product_name} x{item.quantity}</span>
                      <span className="font-medium text-stone-800">euro{(item.product_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-stone-100 pt-2 flex justify-between font-bold text-sm">
                    <span>Totale</span><span className="text-amber-700">euro{order.total.toFixed(2)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 mb-1 block">Aggiorna stato</label>
                  <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
