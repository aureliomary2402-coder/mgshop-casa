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

interface CustomerGroup {
  normalized: string
  phone_number: string
  customer_name: string | null
  orders: PendingItem[]
  total: number
  oldestCreatedAt: string
}

// Stessa identica logica di normalizzazione usata in clienti-manager / orders /
// loyalty / chat, così un cliente viene riconosciuto come lo stesso anche se il
// numero è stato scritto con prefisso, spazi o formati diversi.
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

  // Raggruppa gli ordini per cliente in base al numero di telefono
  // normalizzato: chi ha più ordini (prodotti e/o biglietti) da ritirare
  // vede una sola scheda con tutto dentro, invece di una scheda per ordine.
  // Gli item arrivano già ordinati dal più vecchio al più recente, quindi il
  // primo ordine incontrato per ogni cliente resta quello che determina
  // l'urgenza del gruppo.
  const groups = useMemo(() => {
    const map = new Map<string, CustomerGroup>()
    for (const item of items || []) {
      const normalized = normalizePhone(item.phone_number)
      let group = map.get(normalized)
      if (!group) {
        group = {
          normalized,
          phone_number: item.phone_number,
          customer_name: item.customer_name,
          orders: [],
          total: 0,
          oldestCreatedAt: item.created_at,
        }
        map.set(normalized, group)
      }
      group.orders.push(item)
      group.total += Number(item.total)
      if (!group.customer_name && item.customer_name) group.customer_name = item.customer_name
      // Mostra sempre il numero di telefono dell'ordine più recente del cliente,
      // ma l'urgenza del gruppo resta legata all'ordine più vecchio.
      if (item.created_at >= group.oldestCreatedAt) group.phone_number = item.phone_number

      if (item.created_at < group.oldestCreatedAt) group.oldestCreatedAt = item.created_at
    }
    return Array.from(map.values())
  }, [items])

  const markGroupDelivered = async (group: CustomerGroup) => {
    const ids = group.orders.map(o => o.id)
    setMarkingId(group.normalized); setError('')
    try {
      const results = await Promise.all(ids.map(id =>
        fetch('/api/admin/orders', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'delivered' }),
        })
      ))
      if (results.every(r => r.ok)) {
        setItems(prev => (prev || []).filter(i => !ids.includes(i.id)))
      } else {
        setError('Errore nel segnare come consegnato')
      }
    } catch {
      setError('Errore nel segnare come consegnato')
    }
    setMarkingId(null)
  }

  const saveName = async (group: CustomerGroup) => {
    setSavingName(true); setError('')
    const name = nameInput.trim() || null
    try {
      const results = await Promise.all(group.orders.map(o =>
        fetch('/api/admin/orders', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id, customer_name: name }),
        })
      ))
      if (results.every(r => r.ok)) {
        const ids = group.orders.map(o => o.id)
        setItems(prev => (prev || []).map(i => ids.includes(i.id) ? { ...i, customer_name: name } : i))
        setEditingId(null)
      } else {
        setError('Errore nel salvare il nome')
      }
    } catch {
      setError('Errore nel salvare il nome')
    }
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

      {groups.length === 0 ? (
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
          {groups.map(group => {
            const days = daysAgo(group.oldestCreatedAt)
            const { bar, chip } = urgency(days)
            const multi = group.orders.length > 1
            return (
              <div key={group.normalized} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden flex">

                <div className="w-1 shrink-0" style={{ background: bar }} />
                <div className="p-3.5 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      {editingId === group.normalized ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveName(group); if (e.key === 'Escape') setEditingId(null) }}
                            placeholder="Nome cliente"
                            className="text-sm font-semibold text-slate-800 border border-cyan-200 rounded-md px-2 py-1 flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                          <button onClick={() => saveName(group)} disabled={savingName} className="text-green-600 shrink-0"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 shrink-0"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                          {group.customer_name || group.phone_number}
                          <button onClick={() => { setEditingId(group.normalized); setNameInput(group.customer_name || '') }} className="shrink-0">
                            <Pencil className="w-3 h-3 text-slate-300" />
                          </button>
                        </p>
                      )}
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {group.phone_number}
                        {multi && <span className="ml-1.5 text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{group.orders.length} ordini</span>}

                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-cyan-700 flex items-center justify-end gap-0.5">
                        <Euro className="w-3.5 h-3.5" />{group.total.toFixed(2)}
                      </p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 mt-0.5 ${chip}`}>
                        <Clock className="w-2.5 h-2.5" /> {daysAgoLabel(days)}
                      </span>
                    </div>
                  </div>

                  {/* Elenco ordini del cliente: se ce n'è uno solo resta identico a prima,
                      se sono più di uno vengono mostrati come sotto-blocchi con la propria data */}
                  <div className={multi ? 'space-y-2 mb-3' : 'mb-3'}>
                    {group.orders.map(order => (
                      (order.items.length > 0 || order.lottery_numbers.length > 0) && (
                        <div key={order.id}>
                          {multi && (
                            <p className="text-[10px] font-semibold text-slate-400 mb-1">
                              {daysAgoLabel(daysAgo(order.created_at))} · €{Number(order.total).toFixed(2)}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {order.items.map((p, i) => (
                              <span key={i} className="text-[11px] font-medium bg-slate-50 text-slate-600 px-2 py-1 rounded-lg">
                                {p.quantity > 1 ? `${p.quantity}× ` : ''}{p.name}
                              </span>
                            ))}
                            {order.lottery_numbers.length > 0 && (
                              <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Hash className="w-3 h-3" /> Biglietti: {order.lottery_numbers.join(', ')}
                              </span>
                            )}

                          </div>
                        </div>
                      )
                    ))}
                  </div>

                  <button
                    onClick={() => markGroupDelivered(group)}
                    disabled={markingId === group.normalized}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white py-2.5 rounded-lg transition-transform active:scale-95 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
                    <PackageCheck className="w-3.5 h-3.5" />
                    {markingId === group.normalized ? 'Salvataggio...' : multi ? `Consegnato e pagato (${group.orders.length} ordini)` : 'Consegnato e pagato'}
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

