"use client"

import { useState, useEffect, useMemo } from 'react'
import { Truck, Euro, Phone, CheckCircle2, PackageCheck, Hash, Clock, Pencil, Check, X, Package } from 'lucide-react'

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

// Quanti giorni sono passati dalla data dell'ordine: serve sia per
// l'etichetta ("3 giorni fa") sia per decidere il colore di urgenza.
function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}
function daysAgoLabel(days: number) {
  if (days <= 0) return 'Oggi'
  if (days === 1) return 'Ieri'
  return `${days} giorni fa`
}

// Più tempo passa senza consegnare/incassare, più il colore vira verso il
// rosso: un colpo d'occhio dice subito quali sono più urgenti, senza dover
// leggere ogni riga.
function urgency(days: number) {
  if (days >= 5) return { bar: '#ef4444', chip: 'bg-red-50 text-red-600' }
  if (days >= 2) return { bar: '#f59e0b', chip: 'bg-amber-50 text-amber-700' }
  return { bar: '#0891b2', chip: 'bg-cyan-50 text-cyan-700' }
}

export function PendingFulfillment() {
  const [items, setItems] = useState<PendingItem[] | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  const load = () => {
    fetch('/api/admin/pending-fulfillment').then(r => r.json()).then(d => setItems(d.pending || [])).catch(() => setItems([]))
  }

  useEffect(() => { load() }, [])

  const totalDue = useMemo(() => (items || []).reduce((s, i) => s + Number(i.total), 0), [items])

  const markDelivered = async (id: string) => {
    setMarkingId(id); setError('')
    const res = await fetch('/api/admin/orders', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'delivered' }),
    })
    if (res.ok) setItems(prev => (prev || []).filter(i => i.id !== id))
    else setError('Errore nel segnare come consegnato')
    setMarkingId(null)
  }

  const saveName = async (id: string) => {
    setSavingName(true); setError('')
    const res = await fetch('/api/admin/orders', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, customer_name: nameInput.trim() || null }),
    })
    if (res.ok) {
      setItems(prev => (prev || []).map(i => i.id === id ? { ...i, customer_name: nameInput.trim() || null } : i))
      setEditingId(null)
    } else setError('Errore nel salvare il nome')
    setSavingName(false)
  }

  if (items === null) return (
    <div>
      <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Truck className="w-4 h-4 text-cyan-600" /> Da consegnare e incassare
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-slate-100 rounded-xl h-20 animate-pulse" />
        <div className="bg-slate-100 rounded-xl h-20 animate-pulse" />
      </div>
      <div className="bg-slate-100 rounded-xl h-24 animate-pulse" />
    </div>
  )

  return (
    <div>
      <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Truck className="w-4 h-4 text-cyan-600" /> Da consegnare e incassare
      </h2>

      {/* Contatori riepilogativi */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-cyan-50 text-cyan-600">
            <Package className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-slate-800">{items.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">{items.length === 1 ? 'ordine da consegnare' : 'ordini da consegnare'}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-green-50 text-green-600">
            <Euro className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-slate-800">€{totalDue.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-0.5">ancora da incassare</p>
        </div>
      </div>

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
          {items.map(item => {
            const days = daysAgo(item.created_at)
            const { bar, chip } = urgency(days)
            return (
              <div key={item.id} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden flex">
                <div className="w-1 shrink-0" style={{ background: bar }} />
                <div className="p-3.5 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveName(item.id); if (e.key === 'Escape') setEditingId(null) }}
                            placeholder="Nome cliente"
                            className="text-sm font-semibold text-slate-800 border border-cyan-200 rounded-md px-2 py-1 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                          <button onClick={() => saveName(item.id)} disabled={savingName} className="text-green-600 shrink-0"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 shrink-0"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                          {item.customer_name || item.phone_number}
                          <button onClick={() => { setEditingId(item.id); setNameInput(item.customer_name || '') }} className="shrink-0">
                            <Pencil className="w-3 h-3 text-slate-300" />
                          </button>
                        </p>
                      )}
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {item.phone_number}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-cyan-700 flex items-center justify-end gap-0.5">
                        <Euro className="w-3.5 h-3.5" />{Number(item.total).toFixed(2)}
                      </p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 mt-0.5 ${chip}`}>
                        <Clock className="w-2.5 h-2.5" /> {daysAgoLabel(days)}
                      </span>
                    </div>
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
              </div>
            )
          })}
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  )
}
