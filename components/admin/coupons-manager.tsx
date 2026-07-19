"use client"

import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, ToggleLeft, ToggleRight, Tag, Percent, Euro, Globe, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Coupon {
  id: string; code: string; discount_percent: number; discount_fixed: number
  scope: string; is_active: boolean; max_uses: number | null; uses_count: number; expires_at: string | null; created_at: string
}

const emptyForm = { code: '', discount_percent: '', discount_fixed: '', scope: 'all', is_active: true, max_uses: '', expires_at: '' }

export function CouponsManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchCoupons() }, [])

  const fetchCoupons = async () => {
    const res = await fetch('/api/admin/coupons')
    setCoupons(await res.json())
    setLoading(false)
  }

  const openCreate = () => {
    setForm(emptyForm)
    setEditing(null)
    setCreating(true)
    setError('')
  }

  const openEdit = (c: Coupon) => {
    setForm({
      code: c.code,
      discount_percent: c.discount_percent ? String(c.discount_percent) : '',
      discount_fixed: c.discount_fixed ? String(c.discount_fixed) : '',
      scope: c.scope,
      is_active: c.is_active,
      max_uses: c.max_uses ? String(c.max_uses) : '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '',
    })
    setEditing(c)
    setCreating(false)
    setError('')
  }

  const handleSave = async () => {
    if (!form.code) { setError('Inserisci un codice coupon'); return }
    if (!form.discount_percent && !form.discount_fixed) { setError('Inserisci uno sconto (% o fisso)'); return }
    setSaving(true)
    setError('')
    const body = {
      code: form.code,
      discount_percent: parseFloat(form.discount_percent) || 0,
      discount_fixed: parseFloat(form.discount_fixed) || 0,
      scope: form.scope,
      is_active: form.is_active,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
      ...(editing ? { id: editing.id } : {}),
    }
    const res = await fetch('/api/admin/coupons', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) { setCreating(false); setEditing(null); fetchCoupons() }
    else { const d = await res.json(); setError(d.error || 'Errore') }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo coupon?')) return
    await fetch('/api/admin/coupons', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchCoupons()
  }

  const handleToggle = async (c: Coupon) => {
    await fetch('/api/admin/coupons', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...c, is_active: !c.is_active }) })
    fetchCoupons()
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  if (creating || editing) return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">{creating ? 'Nuovo coupon' : 'Modifica coupon'}</h2>
        <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setEditing(null) }}>Annulla</Button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Codice coupon *</label>
          <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="ES. SCONTO20" className="font-mono font-bold tracking-wider" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Percent className="w-3 h-3"/> Sconto %</label>
            <Input type="number" min="0" max="100" value={form.discount_percent}
              onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))} placeholder="Es. 20" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Euro className="w-3 h-3"/> Sconto fisso €</label>
            <Input type="number" min="0" value={form.discount_fixed}
              onChange={e => setForm(f => ({ ...f, discount_fixed: e.target.value }))} placeholder="Es. 5.00" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Dove è valido</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setForm(f => ({ ...f, scope: 'all' }))}
              className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${form.scope === 'all' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Globe className="w-4 h-4"/> Tutto lo shop
            </button>
            <button onClick={() => setForm(f => ({ ...f, scope: 'promo' }))}
              className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${form.scope === 'promo' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <Sparkles className="w-4 h-4"/> Solo promo
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Usi massimi</label>
            <Input type="number" min="1" value={form.max_uses}
              onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Illimitati" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Scadenza</label>
            <Input type="datetime-local" value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-500">Attivo</label>
          <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
            {form.is_active ? <ToggleRight className="w-8 h-8 text-cyan-600"/> : <ToggleLeft className="w-8 h-8 text-slate-300"/>}
          </button>
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full bg-cyan-600 hover:bg-cyan-700">
        {saving ? 'Salvataggio...' : 'Salva coupon'}
      </Button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Coupon ({coupons.length})</h2>
        <Button onClick={openCreate} size="sm" className="bg-cyan-600 hover:bg-cyan-700 gap-1">
          <Plus className="w-4 h-4"/> Nuovo
        </Button>
      </div>
      {coupons.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">Nessun coupon. Creane uno!</p>}
      <div className="space-y-2">
        {coupons.map(c => (
          <div key={c.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-slate-800 tracking-wider">{c.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.scope === 'promo' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {c.scope === 'promo' ? 'Solo promo' : 'Tutto shop'}
                  </span>
                  {!c.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Disattivo</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  {c.discount_percent > 0 && <span className="text-cyan-700 font-semibold">-{c.discount_percent}%</span>}
                  {c.discount_fixed > 0 && <span className="text-cyan-700 font-semibold">-€{c.discount_fixed}</span>}
                  <span>Usato {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ''} volte</span>
                  {c.expires_at && <span>Scade {new Date(c.expires_at).toLocaleDateString('it-IT')}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleToggle(c)}>
                  {c.is_active ? <ToggleRight className="w-6 h-6 text-cyan-600"/> : <ToggleLeft className="w-6 h-6 text-slate-300"/>}
                </button>
                <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                  <Pencil className="w-4 h-4 text-slate-500"/>
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4 text-red-400"/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
