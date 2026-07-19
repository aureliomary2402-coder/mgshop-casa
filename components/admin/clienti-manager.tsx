"use client"

import { useState, useEffect } from 'react'
import { Users, Search, X, TrendingUp, ShoppingBag, Phone, Star, Gift, Plus, Minus, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Cliente {
  normalized: string
  phone_number: string
  customer_name: string | null
  orders: number
  total: number
  last_order: string
  statuses: string[]
  loyaltyPoints?: number
  loyaltyReady?: boolean
}

interface LoyaltyHistory {
  id: string
  points: number
  note: string | null
  created_at: string
}

function LoyaltyPanel({ cliente }: { cliente: Cliente }) {
  const [totalPoints, setTotalPoints] = useState<number | null>(null)
  const [history, setHistory] = useState<LoyaltyHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [adding, setAdding] = useState(false)
  const [pointsInput, setPointsInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'add' | 'remove'>('add')

  useEffect(() => { fetchPoints() }, [])

  const fetchPoints = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/loyalty?phone=${encodeURIComponent(cliente.phone_number)}`)
    const data = await res.json()
    setTotalPoints(data.total)
    setHistory(data.history)
    setLoading(false)
  }

  const handleSave = async () => {
    if (!pointsInput || parseInt(pointsInput) <= 0) return
    setSaving(true)
    const points = mode === 'add' ? parseInt(pointsInput) : -parseInt(pointsInput)
    await fetch('/api/admin/loyalty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cliente.phone_number, points, note: noteInput || null })
    })
    setPointsInput('')
    setNoteInput('')
    setAdding(false)
    setSaving(false)
    fetchPoints()
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-cyan-600" />
          <span className="text-sm font-semibold text-slate-700">Punti fedeltà</span>
          {loading ? (
            <span className="text-xs text-slate-400">Caricamento...</span>
          ) : (
            <span className="text-lg font-bold text-cyan-600">{totalPoints ?? 0} pt</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHistory(v => !v)}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {showHistory ? 'Nascondi' : 'Storico'}
          </button>
          <button onClick={() => { setAdding(v => !v); setMode('add') }}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: adding ? 'rgba(8,145,178,0.15)' : 'rgba(8,145,178,0.08)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.2)' }}>
            <Plus className="w-3.5 h-3.5" /> Gestisci punti
          </button>
        </div>
      </div>

      {/* Form aggiunta/rimozione punti */}
      {adding && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 space-y-2 mb-2">
          <div className="flex gap-2">
            <button onClick={() => setMode('add')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${mode==='add' ? 'bg-cyan-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
              <Plus className="w-3.5 h-3.5" /> Aggiungi
            </button>
            <button onClick={() => setMode('remove')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${mode==='remove' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
              <Minus className="w-3.5 h-3.5" /> Togli
            </button>
          </div>
          <div className="flex gap-2">
            <Input
              type="number" min="1"
              placeholder="Punti"
              value={pointsInput}
              onChange={e => setPointsInput(e.target.value)}
              className="w-24 text-center font-bold"
            />
            <Input
              placeholder="Nota (es. Premio ordine #5)"
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !pointsInput}
              className="flex-1 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition-all"
              style={{ background: mode === 'add' ? 'linear-gradient(135deg,#0891b2,#06b6d4)' : '#ef4444' }}>
              {saving ? 'Salvataggio...' : mode === 'add' ? `Aggiungi ${pointsInput || '?'} pt` : `Togli ${pointsInput || '?'} pt`}
            </button>
            <button onClick={() => setAdding(false)}
              className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors">
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Storico */}
      {showHistory && history.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {history.slice(0, 10).map(h => (
            <div key={h.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg"
              style={{ background: h.points > 0 ? 'rgba(22,163,74,0.05)' : 'rgba(239,68,68,0.05)' }}>
              <span className="text-slate-500">{h.note || (h.points > 0 ? 'Punti aggiunti' : 'Punti rimossi')}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{new Date(h.created_at).toLocaleDateString('it-IT')}</span>
                <span className={`font-bold ${h.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {h.points > 0 ? '+' : ''}{h.points} pt
                </span>
              </div>
            </div>
          ))}
          {history.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Nessuna transazione</p>}
        </div>
      )}
    </div>
  )
}

export function ClientiManager() {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/clienti').then(r => r.json()).then(d => { setClienti(d); setLoading(false) })
  }, [])

  const filtered = clienti.filter(c => {
    const q = search.toLowerCase()
    return c.phone_number.toLowerCase().includes(q) || c.normalized.includes(q) || (c.customer_name || '').toLowerCase().includes(q)
  })

  const totalClienti = clienti.length
  const totalOrdini = clienti.reduce((s, c) => s + c.orders, 0)
  const totalIncasso = clienti.reduce((s, c) => s + c.total, 0)
  const clientiAbituali = clienti.filter(c => c.orders >= 2).length

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2">
        <Users className="w-4 h-4 text-cyan-600" /> Clienti ({totalClienti})
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-2"><Users className="w-4 h-4 text-blue-600"/></div>
          <p className="text-xl font-bold text-slate-800">{totalClienti}</p>
          <p className="text-xs text-slate-500">Clienti totali</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center mb-2"><ShoppingBag className="w-4 h-4 text-cyan-600"/></div>
          <p className="text-xl font-bold text-slate-800">{totalOrdini}</p>
          <p className="text-xs text-slate-500">Ordini totali</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-2"><TrendingUp className="w-4 h-4 text-green-600"/></div>
          <p className="text-xl font-bold text-slate-800">€{totalIncasso.toFixed(2)}</p>
          <p className="text-xs text-slate-500">Incasso totale</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center mb-2"><Star className="w-4 h-4 text-purple-600"/></div>
          <p className="text-xl font-bold text-slate-800">{clientiAbituali}</p>
          <p className="text-xs text-slate-500">Clienti abituali</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"/>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome o numero..." className="pl-9 pr-9"/>
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-4 h-4"/></button>}
      </div>

      <div className="space-y-2">
        {filtered.map((c, i) => (
          <div key={c.normalized} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpanded(expanded===c.normalized?null:c.normalized)}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                style={{ background: `hsl(${(i*47)%360},60%,90%)`, color: `hsl(${(i*47)%360},60%,35%)` }}>
                {c.customer_name ? c.customer_name[0].toUpperCase() : <Phone className="w-4 h-4"/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800">{c.customer_name || c.phone_number}</p>
                  {c.orders >= 2 && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">Abituale</span>}
                  {c.orders >= 5 && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-cyan-100 text-cyan-700">⭐ VIP</span>}
                  {c.loyaltyReady && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">🎁 Pronto premio</span>}
                </div>
                {c.customer_name && <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3"/> {c.phone_number}</p>}
                <p className="text-xs text-slate-400 mt-0.5">Ultimo ordine: {new Date(c.last_order).toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'})}</p>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                <div>
                  <p className="font-bold text-cyan-700">€{c.total.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{c.orders} {c.orders===1?'ordine':'ordini'}</p>
                  {typeof c.loyaltyPoints === 'number' && <p className="text-xs text-cyan-600 font-medium">{c.loyaltyPoints} pt</p>}
                </div>
                {expanded===c.normalized ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
              </div>
            </div>
            {expanded === c.normalized && (
              <div className="px-4 pb-4">
                <LoyaltyPanel cliente={c} />
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">Nessun cliente trovato</p>}
      </div>
    </div>
  )
}
