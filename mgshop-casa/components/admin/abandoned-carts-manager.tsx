"use client"

import { useState, useEffect } from 'react'
import { AlertTriangle, Trash2, Phone, ShoppingCart } from 'lucide-react'

interface AbandonedCartItem { name: string; quantity: number; price: number }
interface AbandonedCart {
  id: string
  session_id: string
  items: AbandonedCartItem[]
  items_count: number
  total: number
  phone_number: string | null
  updated_at: string
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'ora'
  if (min < 60) return `${min} min fa`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h fa`
  const d = Math.floor(h / 24)
  return `${d} g fa`
}

export function AbandonedCartsManager() {
  const [carts, setCarts] = useState<AbandonedCart[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCarts = () => {
    fetch('/api/admin/abandoned-carts')
      .then(r => r.json())
      .then(d => setCarts(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCarts() }, [])

  const handleDelete = async (id: string) => {
    setCarts(prev => prev.filter(c => c.id !== id))
    await fetch('/api/admin/abandoned-carts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" /> Carrelli abbandonati ({carts.length})
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Clienti che hanno lasciato prodotti nel carrello e chiuso il sito senza completare l&apos;ordine</p>
      </div>

      {carts.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-400 text-sm">Nessun carrello abbandonato al momento</p>
        </div>
      )}

      <div className="space-y-2">
        {carts.map(cart => (
          <div key={cart.id} className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">
                    {cart.items_count} articol{cart.items_count === 1 ? 'o' : 'i'}
                  </span>
                  <span className="text-xs text-slate-400">{timeAgo(cart.updated_at)}</span>
                  {cart.phone_number && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {cart.phone_number}
                    </span>
                  )}
                </div>
                <div className="mt-2 space-y-0.5">
                  {cart.items.map((it, i) => (
                    <p key={i} className="text-sm text-slate-600 truncate">{it.name} <span className="text-slate-400">×{it.quantity}</span></p>
                  ))}
                </div>
                <p className="text-sm font-bold text-slate-800 mt-1.5">Totale: €{cart.total.toFixed(2)}</p>
              </div>
              <button onClick={() => handleDelete(cart.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
