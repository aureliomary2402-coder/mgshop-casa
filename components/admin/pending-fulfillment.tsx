"use client"

import { useState, useEffect } from 'react'
import { Truck, Euro, Phone, CheckCircle2, PackageCheck, Hash, Clock } from 'lucide-react'

interface PendingItem {
  id: string
  phone_number: string
  customer_name: string | null
  total: number
  status: string
  created_at: string
  is_ticket_only: boolean
  items: { name: string; quantity: number }[]
  lottery_numbers: number[]
}

// Quanti giorni sono passati dalla data dell'ordine, per capire a colpo
// d'occhio quali sono in sospeso da più tempo (es. "5 giorni fa").
function daysAgoLabel(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Oggi'
  if (days === 1) return 'Ieri'
  return `${days} giorni fa`
}

export function PendingFulfillment() {
  const [items, setItems] = useState<PendingItem[] | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    fetch('/api/admin/pending-fulfillment').then(r => r.json()).then(d => setItems(d.pending || [])).catch(() => setItems([]))
  }

  useEffect(() => { load() }, [])

  const markDelivered = async (id: string) => {
    setMarkingId(id); setError('')
    const res = await fetch('/api/admin/orders', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'delivered' }),
    })
    if (res.ok) setItems(prev => (prev || []).filter(i => i.id !== id))
    else setError('Errore nel segnare come consegnato')
    setMarkingId(null)
  }

  if (items === null) return (
    <div>
      <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Truck className="w-4 h-4 text-cyan-600" /> Da consegnare e incassare
      </h2>
      <div className="bg-slate-100 rounded-xl h-20 animate-pulse" />
    </div>
  )

  return (
    <div>
      <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Truck className="w-4 h-4 text-cyan-600" /> Da consegnare e incassare {items.length > 0 && `(${items.length})`}
      </h2>

      {items.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-50 text-green-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Tutto consegnato e incassato</p>
            <p className="text-xs text-slate-400">Non c'è nessun ordine o biglietto in sospeso al momento.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.customer_name || item.phone_number}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" /> {item.phone_number}
                    <span className="mx-1">·</span>
                    <Clock className="w-3 h-3" /> {daysAgoLabel(item.created_at)}
                  </p>
                </div>
                <span className="text-base font-bold text-cyan-700 shrink-0 flex items-center gap-0.5">
                  <Euro className="w-3.5 h-3.5" />{Number(item.total).toFixed(2)}
                </span>
              </div>

              {(item.items.length > 0 || item.lottery_numbers.length > 0) && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.items.map((p, i) => (
                    <span key={i} className="text-[11px] font-medium bg-slate-50 text-slate-600 px-2 py-1 rounded-lg">
                      {p.quantity > 1 ? `${p.quantity}× ` : ''}{p.name}
                    </span>
                  ))}
                  {item.lottery_numbers.length > 0 && (
                    <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-1 rounded-lg flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Biglietti: {item.lottery_numbers.join(', ')}
                    </span>
                  )}
                </div>
              )}

              <button
                onClick={() => markDelivered(item.id)}
                disabled={markingId === item.id}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white py-2.5 rounded-lg transition-transform active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
                <PackageCheck className="w-3.5 h-3.5" />
                {markingId === item.id ? 'Salvataggio...' : 'Consegnato e pagato'}
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  )
}
