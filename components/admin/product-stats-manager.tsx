"use client"

import { useState, useEffect } from 'react'
import { TrendingUp, Flame, Search } from 'lucide-react'

interface TopSelling {
  key: string
  product_id: string | null
  name: string
  quantity: number
  revenue: number
}

interface TopSearched {
  term: string
  count: number
}

export function ProductStatsManager() {
  const [topSelling, setTopSelling] = useState<TopSelling[]>([])
  const [topSearched, setTopSearched] = useState<TopSearched[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/product-stats')
      .then(r => r.json())
      .then(d => { setTopSelling(d.topSelling || []); setTopSearched(d.topSearched || []) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  const maxQty = topSelling[0]?.quantity || 1
  const maxCount = topSearched[0]?.count || 1

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-cyan-600" /> Statistiche prodotti
      </h2>

      {/* Prodotti più venduti */}
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><Flame className="w-4 h-4 text-amber-600" /></div>
          <h3 className="font-semibold text-slate-800">Prodotti più venduti</h3>
        </div>
        {topSelling.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Nessun ordine ancora registrato</p>
        ) : (
          <div className="space-y-2.5">
            {topSelling.map((p, i) => (
              <div key={p.key} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: i === 0 ? '#fde68a' : 'rgba(8,145,178,0.08)', color: i === 0 ? '#92400e' : '#0891b2' }}>
                      {i + 1}
                    </span>
                    <span className="font-medium text-slate-700 truncate">{p.name}</span>
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">{p.quantity} pz · €{p.revenue.toFixed(2)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(p.quantity / maxQty) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prodotti/termini più cercati */}
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center"><Search className="w-4 h-4 text-cyan-600" /></div>
          <h3 className="font-semibold text-slate-800">Più cercati</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">Termini digitati nella barra di ricerca, ultimi 30 giorni</p>
        {topSearched.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Nessuna ricerca registrata ancora</p>
        ) : (
          <div className="space-y-2.5">
            {topSearched.map((s, i) => (
              <div key={s.term} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: i === 0 ? '#a5f3fc' : 'rgba(8,145,178,0.08)', color: '#0891b2' }}>
                      {i + 1}
                    </span>
                    <span className="font-medium text-slate-700 truncate capitalize">{s.term}</span>
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">{s.count} {s.count === 1 ? 'ricerca' : 'ricerche'}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(s.count / maxCount) * 100}%`, background: 'linear-gradient(90deg, #0891b2, #22d3ee)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
