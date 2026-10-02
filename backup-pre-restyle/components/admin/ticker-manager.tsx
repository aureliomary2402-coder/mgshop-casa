"use client"

import { useState, useEffect } from 'react'
import { ToggleLeft, ToggleRight, Save, Rss } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TickerManager() {
  const [message, setMessage] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/ticker')
      .then(r => r.json())
      .then(d => {
        setMessage(d.message || '')
        setIsActive(d.is_active === true)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true); setError('')
    const res = await fetch('/api/admin/ticker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, is_active: isActive }),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    else setError('Errore salvataggio')
    setSaving(false)
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between p-4 rounded-2xl border"
        style={{ background: isActive ? 'rgba(8,145,178,0.06)' : 'rgba(0,0,0,0.02)', borderColor: isActive ? 'rgba(8,145,178,0.2)' : 'rgba(0,0,0,0.08)' }}>
        <div>
          <p className="font-semibold text-slate-800 flex items-center gap-1.5"><Rss className="w-4 h-4" /> Striscia messaggi</p>
          <p className="text-xs mt-0.5">
            {isActive ? <span className="text-cyan-600 font-medium">Attiva — ricordati di salvare!</span> : <span className="text-slate-400">Disattivata — ricordati di salvare!</span>}
          </p>
        </div>
        <button onClick={() => setIsActive(v => !v)} className="focus:outline-none hover:scale-110 transition-transform">
          {isActive ? <ToggleRight className="w-10 h-10 text-cyan-600" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
        </button>
      </div>

      <div className="p-3 rounded-xl text-xs text-cyan-700 font-medium" style={{ background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.15)' }}>
        Compare come una striscia sottile in basso su tutto il sito (tranne nel pannello admin), con questo testo che scorre in loop. I clienti possono chiuderla con la X.
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">Messaggio</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Es. 🔥 Sconto 20% su tutti i detersivi · Spedizione gratis oltre 30€ · Offerta lampo sugli asciugamani" />
        <p className="text-[11px] text-slate-400 mt-1">Scrivilo come un'unica riga: si ripete più volte scorrendo, quindi lascia degli spazi o simboli (es. " · ") tra le offerte se ne scrivi più di una.</p>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700 text-base py-6">
        <Save className="w-5 h-5" />
        {saved ? 'Salvato!' : saving ? 'Salvataggio...' : 'Salva modifiche'}
      </Button>
    </div>
  )
}
