"use client"

import { useState, useEffect } from 'react'
import { Users, Search, X, TrendingUp, ShoppingBag, Phone, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Cliente {
  normalized: string
  phone_number: string
  customer_name: string | null
  orders: number
  total: number
  last_order: string
  statuses: string[]
}

export function ClientiManager() {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/clienti').then(r => r.json()).then(d => { setClienti(d); setLoading(false) })
  }, [])

  const filtered = clienti.filter(c => {
    const q = search.toLowerCase()
    return (
      c.phone_number.toLowerCase().includes(q) ||
      c.normalized.includes(q) ||
      (c.customer_name || '').toLowerCase().includes(q)
    )
  })

  const totalClienti = clienti.length
  const totalOrdini = clienti.reduce((s, c) => s + c.orders, 0)
  const totalIncasso = clienti.reduce((s, c) => s + c.total, 0)
  const clientiAbituali = clienti.filter(c => c.orders >= 2).length

  if (loading) return <div className="text-center py-8 text-stone-400">Caricamento...</div>

  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-stone-800 flex items-center gap-2">
        <Users className="w-4 h-4 text-amber-600" /> Clienti ({totalClienti})
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-stone-100 rounded-xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-stone-800">{totalClienti}</p>
          <p className="text-xs text-stone-500">Clienti totali</p>
        </div>
        <div className="bg-white border border-stone-100 rounded-xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
            <ShoppingBag className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-stone-800">{totalOrdini}</p>
          <p className="text-xs text-stone-500">Ordini totali</p>
        </div>
        <div className="bg-white border border-stone-100 rounded-xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xl font-bold text-stone-800">€{totalIncasso.toFixed(2)}</p>
          <p className="text-xs text-stone-500">Incasso da clienti</p>
        </div>
        <div className="bg-white border border-stone-100 rounded-xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center mb-2">
            <Star className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-stone-800">{clientiAbituali}</p>
          <p className="text-xs text-stone-500">Clienti abituali (2+ ordini)</p>
        </div>
      </div>

      {/* Ricerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cerca per nome o numero..." className="pl-9 pr-9" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"><X className="w-4 h-4" /></button>}
      </div>

      {/* Lista clienti */}
      <div className="space-y-2">
        {filtered.map((c, i) => (
          <div key={c.normalized} className="bg-white border border-stone-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                style={{ background: `hsl(${(i*47)%360}, 60%, 90%)`, color: `hsl(${(i*47)%360}, 60%, 35%)` }}>
                {c.customer_name ? c.customer_name[0].toUpperCase() : <Phone className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-stone-800">
                    {c.customer_name || c.phone_number}
                  </p>
                  {c.orders >= 2 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                      Abituale
                    </span>
                  )}
                  {c.orders >= 5 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                      ⭐ VIP
                    </span>
                  )}
                </div>
                {c.customer_name && (
                  <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {c.phone_number}
                  </p>
                )}
                <p className="text-xs text-stone-400 mt-0.5">
                  Ultimo ordine: {new Date(c.last_order).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold text-amber-700">€{c.total.toFixed(2)}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {c.orders} {c.orders === 1 ? 'ordine' : 'ordini'}
                </p>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-center py-8 text-stone-400 text-sm">Nessun cliente trovato</p>
        )}
      </div>
    </div>
  )
}
