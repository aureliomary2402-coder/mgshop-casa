"use client"

import { useState, useEffect } from 'react'
import { Save, ToggleLeft, ToggleRight, Trash2, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSiteTheme } from '@/components/site-theme-provider'
import { SLOT_PRIZE_SYMBOLS, symbolForDiscount } from '@/lib/slot-theme'

interface Settings { is_active: boolean; win_probability: number }
interface Prize { id: string; label: string; discount_percent: number; weight: number; is_active: boolean }
interface Spin { id: string; phone_number: string; won: boolean; prize_label: string | null; discount_percent: number; used_order_id: string | null; created_at: string }

export function SlotManager() {
  const siteTheme = useSiteTheme()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [spins, setSpins] = useState<Spin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newDiscount, setNewDiscount] = useState('10')
  const [newWeight, setNewWeight] = useState('1')

  const load = async () => {
    const res = await fetch('/api/admin/slot')
    const d = await res.json().catch(() => null)
    if (!res.ok || !d?.settings) { setError(d?.error || 'Impossibile caricare la slot: hai eseguito add-slot-machine.sql su Supabase?'); setLoading(false); return }
    setSettings(d.settings); setPrizes(d.prizes); setSpins(d.spins); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const saveSettings = async (next: Settings) => {
    setSaving(true)
    const res = await fetch('/api/admin/slot', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) } else setError('Salvataggio non riuscito')
  }

  const savePrize = async (p: Partial<Prize>) => {
    const res = await fetch('/api/admin/slot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
    const d = await res.json().catch(() => null)
    if (!res.ok) { setError(d?.error || 'Premio non salvato'); return false }
    setError(''); await load(); return true
  }

  const removePrize = async (id: string) => {
    if (!confirm('Eliminare questo premio?')) return
    await fetch('/api/admin/slot', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const addPrize = async () => {
    const ok = await savePrize({ label: newLabel || `Sconto ${newDiscount}%`, discount_percent: parseFloat(newDiscount), weight: parseInt(newWeight) || 1, is_active: true })
    if (ok) { setNewLabel(''); setNewDiscount('10'); setNewWeight('1') }
  }

  const patchPrize = (id: string, patch: Partial<Prize>) => setPrizes(list => list.map(p => p.id === id ? { ...p, ...patch } : p))

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>
  if (!settings) return <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>

  const p = settings.win_probability
  const activePrizes = prizes.filter(x => x.is_active)
  const totalWeight = activePrizes.reduce((s, x) => s + x.weight, 0)

  return (
    <div className="space-y-5">
      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="flex items-center justify-between p-4 rounded-2xl border"
        style={{ background: settings.is_active ? 'rgba(255,143,51,0.08)' : 'rgba(0,0,0,0.02)', borderColor: settings.is_active ? 'rgba(255,143,51,0.35)' : 'rgba(0,0,0,0.08)' }}>
        <div>
          <p className="font-semibold text-slate-800">🎰 Slot dopo l&apos;ordine</p>
          <p className="text-xs mt-0.5">
            {settings.is_active ? <span className="text-orange-600 font-medium">✅ Attiva — appare dopo l&apos;invio dell&apos;ordine</span> : <span className="text-slate-400">❌ Disattivata</span>}
          </p>
        </div>
        <button onClick={() => { const next = { ...settings, is_active: !settings.is_active }; setSettings(next); saveSettings(next) }} className="focus:outline-none hover:scale-110 transition-transform">
          {settings.is_active ? <ToggleRight className="w-10 h-10 text-orange-500" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <label className="text-xs font-medium text-slate-500 block">Probabilità di vittoria (%)</label>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={100} step={1} value={p} onChange={e => setSettings({ ...settings, win_probability: parseFloat(e.target.value) })} className="flex-1 accent-orange-500" />
          <Input type="number" min={0} max={100} step={0.5} className="w-24" value={p} onChange={e => setSettings({ ...settings, win_probability: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })} />
        </div>
        <p className="text-xs text-slate-500">
          Un cliente su {p > 0 ? Math.round(100 / p) : '∞'} circa vince un premio ({p}%). Puoi cambiarla quando vuoi: vale dalla giocata successiva.
        </p>
        <Button onClick={() => saveSettings(settings)} disabled={saving} className="w-full gap-2 bg-orange-500 hover:bg-orange-600">
          <Save className="w-4 h-4" />{saved ? '✓ Salvato!' : saving ? 'Salvataggio...' : 'Salva probabilità'}
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="font-semibold text-slate-800">Premi (sconto sul prossimo ordine)</p>
        <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-sm text-slate-700">
          <p className="text-xs font-semibold text-orange-700 mb-1">Simboli vincenti (tema attuale)</p>
          {Object.entries(SLOT_PRIZE_SYMBOLS[siteTheme]).map(([pct, sym]) => `${sym} = ${pct}%`).join('   ·   ')}
        </div>
        <p className="text-xs text-slate-400">Quando un cliente vince, il premio viene scelto tra quelli attivi in base al &quot;peso&quot;: più è alto, più esce spesso.</p>
        {prizes.length === 0 && <p className="text-sm text-slate-400">Nessun premio: finché non ne aggiungi uno la slot non assegna vincite.</p>}
        {prizes.map(pz => (
          <div key={pz.id} className="rounded-xl border border-slate-100 p-3 space-y-2" style={{ opacity: pz.is_active ? 1 : 0.55 }}>
            <div className="flex gap-2">
              <Input value={pz.label} onChange={e => patchPrize(pz.id, { label: e.target.value })} placeholder="Nome premio" />
              <button onClick={() => removePrize(pz.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Sconto %</span><Input type="number" min={1} max={100} className="w-20" value={pz.discount_percent} onChange={e => patchPrize(pz.id, { discount_percent: parseFloat(e.target.value) || 0 })} />
              <span>Peso</span><Input type="number" min={1} className="w-16" value={pz.weight} onChange={e => patchPrize(pz.id, { weight: parseInt(e.target.value) || 1 })} />
              <span className="text-base">{symbolForDiscount(siteTheme, pz.discount_percent) ?? '🎲'}</span>
              {pz.is_active && totalWeight > 0 && <span className="text-slate-400">≈ {Math.round((pz.weight / totalWeight) * 100)}% delle vincite</span>}
            </div>
            {!symbolForDiscount(siteTheme, pz.discount_percent) && <p className="text-xs text-amber-600">Per questa percentuale non c&apos;è un simbolo dedicato: uscirà un simbolo a caso.</p>}
            <div className="flex items-center justify-between">
              <button onClick={() => { patchPrize(pz.id, { is_active: !pz.is_active }); savePrize({ ...pz, is_active: !pz.is_active }) }} className="text-xs font-medium text-slate-600">
                {pz.is_active ? '✅ Attivo' : '❌ Disattivato'} (tocca per cambiare)
              </button>
              <Button onClick={() => savePrize(pz)} className="h-8 px-3 text-xs bg-orange-500 hover:bg-orange-600">Salva</Button>
            </div>
          </div>
        ))}
        <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 space-y-2">
          <p className="text-xs font-semibold text-orange-700">Nuovo premio</p>
          <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Es. Sconto 15% (facoltativo)" />
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Sconto %</span><Input type="number" min={1} max={100} className="w-20" value={newDiscount} onChange={e => setNewDiscount(e.target.value)} />
            <span>Peso</span><Input type="number" min={1} className="w-16" value={newWeight} onChange={e => setNewWeight(e.target.value)} />
          </div>
          <Button onClick={addPrize} className="w-full gap-2 bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4" />Aggiungi premio</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="font-semibold text-slate-800 mb-2">Ultime giocate</p>
        {spins.length === 0 && <p className="text-sm text-slate-400">Ancora nessuna giocata.</p>}
        <div className="space-y-1.5">
          {spins.map(s => (
            <div key={s.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
              <span className="text-slate-600">{s.phone_number} · {new Date(s.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <span className={s.won ? 'font-semibold text-orange-600' : 'text-slate-400'}>
                {s.won ? `🎉 ${s.prize_label || ''} (${s.discount_percent}%)${s.used_order_id ? ' · usato' : ' · da usare'}` : 'Nessuna vincita'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
