"use client"

import { useState, useEffect } from 'react'
import { ToggleLeft, ToggleRight, Save, Plus, Trash2, Pencil, Eye, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SitePopupView } from '@/components/shop/site-popup'

interface Popup {
  id?: string
  title: string
  message: string
  button_label: string | null
  button_link: string | null
  frequency: 'session' | 'once'
  is_active: boolean
}

const EMPTY: Popup = { title: '', message: '', button_label: '', button_link: '', frequency: 'session', is_active: true }

export function PopupsManager() {
  const [popups, setPopups] = useState<Popup[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Popup | null>(null)
  const [preview, setPreview] = useState<Popup | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const res = await fetch('/api/admin/popups')
    if (res.ok) setPopups(await res.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async (p: Popup) => {
    setSaving(true); setError('')
    const res = await fetch('/api/admin/popups', {
      method: p.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    })
    if (res.ok) { setEditing(null); await load() }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Errore salvataggio') }
    setSaving(false)
  }

  const toggle = async (p: Popup) => save({ ...p, is_active: !p.is_active })

  const remove = async (p: Popup) => {
    if (!p.id || !confirm('Eliminare questo pop up?')) return
    await fetch(`/api/admin/popups?id=${p.id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  return (
    <div className="space-y-5">
      <div className="p-3 rounded-xl text-xs text-cyan-700 font-medium" style={{ background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.15)' }}>
        Il pop up compare al centro dello schermo (telefono e computer) poco dopo l'ingresso nel sito, con la grafica del tema attuale. I clienti lo chiudono con la X. Se ne attivi più di uno, compaiono uno dopo l'altro.
      </div>

      {!editing && (
        <Button onClick={() => { setError(''); setEditing({ ...EMPTY }) }} className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700 text-base py-6">
          <Plus className="w-5 h-5" /> Nuovo pop up
        </Button>
      )}

      {editing && (
        <div className="space-y-4 p-4 rounded-2xl border border-slate-200 bg-white">
          <p className="font-semibold text-slate-800">{editing.id ? 'Modifica pop up' : 'Nuovo pop up'}</p>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Titolo</label>
            <input value={editing.title} maxLength={80} onChange={e => setEditing({ ...editing, title: e.target.value })}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Es. Spedizione gratuita questo weekend!" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Messaggio</label>
            <textarea value={editing.message} maxLength={600} onChange={e => setEditing({ ...editing, message: e.target.value })}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Scrivi il testo. Puoi andare a capo." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Testo bottone (facoltativo)</label>
              <input value={editing.button_label ?? ''} maxLength={40} onChange={e => setEditing({ ...editing, button_label: e.target.value })}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="Vedi le offerte" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Link del bottone</label>
              <input value={editing.button_link ?? ''} onChange={e => setEditing({ ...editing, button_link: e.target.value })}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="/promo oppure https://..." />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Quando mostrarlo</label>
            <select value={editing.frequency} onChange={e => setEditing({ ...editing, frequency: e.target.value as Popup['frequency'] })}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="session">Una volta a ogni visita (ricompare se il cliente torna)</option>
              <option value="once">Una sola volta per cliente (finché non lo modifichi)</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Attivo sul sito</span>
            <button onClick={() => setEditing({ ...editing, is_active: !editing.is_active })} className="focus:outline-none">
              {editing.is_active ? <ToggleRight className="w-10 h-10 text-cyan-600" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreview(editing)} className="gap-2"><Eye className="w-4 h-4" /> Anteprima</Button>
            <Button onClick={() => save(editing)} disabled={saving} className="flex-1 gap-2 bg-cyan-600 hover:bg-cyan-700">
              <Save className="w-4 h-4" /> {saving ? 'Salvataggio...' : 'Salva'}
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Annulla</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {popups.length === 0 && !editing && <p className="text-center text-sm text-slate-400 py-6">Nessun pop up creato.</p>}
        {popups.map(p => (
          <div key={p.id} className="p-4 rounded-2xl border border-slate-200 bg-white flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0"><MessageSquareText className="w-4 h-4" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800 truncate">{p.title || p.message}</p>
              {p.title && <p className="text-xs text-slate-500 line-clamp-2 whitespace-pre-line">{p.message}</p>}
              <p className="text-[11px] mt-1">
                {p.is_active ? <span className="text-cyan-600 font-medium">Attivo</span> : <span className="text-slate-400">Disattivato</span>}
                <span className="text-slate-400"> · {p.frequency === 'once' ? 'una sola volta' : 'a ogni visita'}</span>
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setPreview(p)} className="p-2 text-slate-500 hover:text-cyan-600" aria-label="Anteprima"><Eye className="w-4 h-4" /></button>
              <button onClick={() => { setError(''); setEditing(p) }} className="p-2 text-slate-500 hover:text-cyan-600" aria-label="Modifica"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => remove(p)} className="p-2 text-slate-500 hover:text-red-500" aria-label="Elimina"><Trash2 className="w-4 h-4" /></button>
              <button onClick={() => toggle(p)} className="focus:outline-none" aria-label="Attiva/disattiva">
                {p.is_active ? <ToggleRight className="w-9 h-9 text-cyan-600" /> : <ToggleLeft className="w-9 h-9 text-slate-300" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {preview && <SitePopupView popup={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
