"use client"

import { useState, useEffect } from 'react'
import { Ticket, Trash2, Pencil, Check, X, User } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pending: 'In attesa', confirmed: 'Confermato', shipped: 'Spedito',
  delivered: 'Consegnato', cancelled: 'Annullato',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-teal-100 text-teal-700', confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface TicketPurchase {
  id: string
  phone_number: string
  customer_name: string | null
  total: number
  status: string
  created_at: string
  numbers: number[]
}

export function LotteryPurchasesManager() {
  const [purchases, setPurchases] = useState<TicketPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => { fetchPurchases() }, [])

  const fetchPurchases = async () => {
    const res = await fetch('/api/admin/lottery/purchases')
    setPurchases(await res.json())
    setLoading(false)
  }

  const handleStatusChange = async (id: string, status: string) => {
    await fetch('/api/admin/lottery/purchases', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    fetchPurchases()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo acquisto di biglietti? I numeri collegati verranno rimossi.')) return
    await fetch('/api/admin/lottery/purchases', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchPurchases()
  }

  const saveName = async (id: string) => {
    await fetch('/api/admin/lottery/purchases', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, customer_name: nameInput.trim() }) })
    setEditingName(null); fetchPurchases()
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800">Biglietti acquistati a parte ({purchases.length})</h2>
        <p className="text-xs text-slate-400 mt-0.5">Acquisti di soli biglietti della lotteria, senza altri prodotti — separati dagli ordini normali.</p>
      </div>

      {purchases.length === 0 && (
        <div className="text-center py-12"><Ticket className="w-10 h-10 mx-auto text-slate-300 mb-2" /><p className="text-slate-400 text-sm">Nessun biglietto acquistato a parte, per ora</p></div>
      )}

      <div className="space-y-2">
        {purchases.map(p => (
          <div key={p.id} className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                {editingName === p.id ? (
                  <div className="flex items-center gap-1">
                    <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(p.id); if (e.key === 'Escape') setEditingName(null) }}
                      placeholder="Nome cliente" autoFocus
                      className="text-sm font-medium border border-amber-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-amber-400" style={{ color: '#0c2b36' }} />
                    <button onClick={() => saveName(p.id)} className="p-1 hover:bg-green-50 rounded-lg"><Check className="w-4 h-4 text-green-500" /></button>
                    <button onClick={() => setEditingName(null)} className="p-1 hover:bg-red-50 rounded-lg"><X className="w-4 h-4 text-red-400" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 group/name">
                    <span className="font-medium text-sm text-slate-800">{p.customer_name || p.phone_number}</span>
                    {p.customer_name && <span className="text-xs text-slate-400">{p.phone_number}</span>}
                    <button onClick={() => { setEditingName(p.id); setNameInput(p.customer_name || '') }}
                      className="p-0.5 opacity-0 group-hover/name:opacity-100 hover:bg-slate-100 rounded transition-all">
                      <Pencil className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(p.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' · '}€{p.total.toFixed(2)}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-600'}`}>
                {STATUS_LABELS[p.status] || p.status}
              </span>
              <button onClick={() => { setEditingName(p.id); setNameInput(p.customer_name || '') }}
                className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors shrink-0"><User className="w-4 h-4 text-amber-500" /></button>
              <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"><Trash2 className="w-4 h-4 text-red-400" /></button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {p.numbers.map(n => (
                <span key={n} className="px-2.5 py-1 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>#{n}</span>
              ))}
              {p.numbers.length === 0 && <span className="text-xs text-slate-300">Nessun numero (verificare)</span>}
            </div>

            <div className="mt-3">
              <select value={p.status} onChange={e => handleStatusChange(p.id, e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                {Object.entries(STATUS_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
