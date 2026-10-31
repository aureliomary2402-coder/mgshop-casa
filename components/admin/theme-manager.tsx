"use client"

import { useState, useEffect } from 'react'
import { CalendarClock, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SITE_THEMES, type SiteThemeName } from '@/lib/site-theme'
import { SLOT_PRIZE_SYMBOLS } from '@/lib/slot-theme'

interface ThemeRow { active_theme: string; next_theme: string | null; switch_at: string | null }

function fmt(iso: string) {
  return new Date(iso).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
}

// Valore di partenza per il campo data/ora: domani alle 00:00 (ora del telefono)
function tomorrowMidnight() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function ThemeManager() {
  const [row, setRow] = useState<ThemeRow | null>(null)
  const [effective, setEffective] = useState<SiteThemeName | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [schedTheme, setSchedTheme] = useState<SiteThemeName>('bolle')
  const [schedAt, setSchedAt] = useState(tomorrowMidnight())

  const apply = (d: { row: ThemeRow; effective: SiteThemeName }) => { setRow(d.row); setEffective(d.effective) }

  const load = async () => {
    const res = await fetch('/api/admin/theme')
    const d = await res.json().catch(() => null)
    if (!res.ok || !d?.row) { setError(d?.error || 'Impossibile caricare il tema'); setLoading(false); return }
    apply(d); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const send = async (payload: Record<string, unknown>) => {
    setBusy(true); setError('')
    const res = await fetch('/api/admin/theme', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok) { setError(d?.error || 'Errore nel salvataggio'); return }
    apply(d)
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>
  if (!row || !effective) return <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>

  const scheduled = row.next_theme && row.switch_at ? SITE_THEMES.find(t => t.id === row.next_theme) : null
  const current = SITE_THEMES.find(t => t.id === effective)

  return (
    <div className="space-y-5">
      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-medium text-slate-500">Tema del sito adesso</p>
        <p className="mt-1 text-xl font-bold text-slate-800">{current?.emoji} {current?.label}</p>
        {scheduled && row.switch_at && (
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Cambio programmato: <b>{scheduled.emoji} {scheduled.label}</b> da {fmt(row.switch_at)}</span>
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="font-semibold text-slate-800">Attiva un tema adesso</p>
        {SITE_THEMES.map(t => {
          const on = t.id === effective
          return (
            <div key={t.id} className={`rounded-2xl border p-4 ${on ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{t.emoji} {t.label}</p>
                  <p className="text-xs text-slate-500">{t.hint}</p>
                  <p className="mt-1 text-xs text-slate-400">Slot: {Object.entries(SLOT_PRIZE_SYMBOLS[t.id]).map(([pct, sym]) => `${sym}=${pct}%`).join('  ')}</p>
                </div>
                {on ? (
                  <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" />Attivo</span>
                ) : (
                  <Button size="sm" disabled={busy} onClick={() => send({ action: 'activate', theme: t.id })} className="shrink-0">Attiva ora</Button>
                )}
              </div>
            </div>
          )
        })}
        <p className="text-xs text-slate-500">Attivando un tema a mano si annulla l&apos;eventuale cambio programmato. Pop up, slot e decorazioni seguono il tema da soli.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="font-semibold text-slate-800">Programma un cambio automatico</p>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Tema da mettere</label>
          <select value={schedTheme} onChange={e => setSchedTheme(e.target.value as SiteThemeName)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
            {SITE_THEMES.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Data e ora</label>
          <input type="datetime-local" value={schedAt} onChange={e => setSchedAt(e.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" />
        </div>
        <Button disabled={busy || !schedAt} onClick={() => send({ action: 'schedule', theme: schedTheme, at: new Date(schedAt).toISOString() })} className="w-full gap-2">
          <CalendarClock className="h-4 w-4" />Programma
        </Button>
        {scheduled && (
          <Button variant="outline" disabled={busy} onClick={() => send({ action: 'cancel_schedule' })} className="w-full gap-2">
            <X className="h-4 w-4" />Annulla il cambio programmato
          </Button>
        )}
        <p className="text-xs text-slate-500">All&apos;orario scelto il sito cambia tema da solo, anche per chi ha la pagina già aperta (entro un minuto).</p>
      </div>
    </div>
  )
}
