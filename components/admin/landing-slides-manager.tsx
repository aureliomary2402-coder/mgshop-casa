"use client"

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ImagePlus, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SlideCard, GRADIENTS, type GradientKey } from '@/components/shop/benefits-carousel'

interface SlideRow {
  id: string
  title: string
  text: string
  emoji: string
  gradient: string
  image_url: string | null
  cta_label: string
  cta_link: string
  is_active: boolean
  display_order: number
}

type Form = Omit<SlideRow, 'id' | 'display_order'> & { id?: string }
const EMPTY: Form = { title: '', text: '', emoji: '🎃', gradient: 'viola', image_url: null, cta_label: '', cta_link: '/shop', is_active: true }

// Ridimensiona la foto prima del caricamento: niente limiti di peso e pagina veloce
async function resizeImage(file: File, maxW = 1100): Promise<File> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxW / bmp.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('resize'))), 'image/jpeg', 0.85))
  return new File([blob], 'slide.jpg', { type: 'image/jpeg' })
}

export function LandingSlidesManager() {
  const [slides, setSlides] = useState<SlideRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    const res = await fetch('/api/admin/landing-slides')
    const d = await res.json().catch(() => null)
    if (!res.ok) { setError(d?.error || 'Errore di caricamento: hai eseguito add-landing-slides.sql su Supabase?'); setLoading(false); return }
    setSlides(d); setError(''); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form) return
    if (!form.title.trim()) { setError('Scrivi almeno il titolo'); return }
    setSaving(true)
    const res = await fetch('/api/admin/landing-slides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const d = await res.json().catch(() => null)
    setSaving(false)
    if (!res.ok) { setError(d?.error || 'Salvataggio non riuscito'); return }
    setForm(null); setError(''); load()
  }

  const remove = async (s: SlideRow) => {
    if (!confirm(`Eliminare la slide "${s.title}"?`)) return
    await fetch('/api/admin/landing-slides', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }) })
    load()
  }

  const toggle = async (s: SlideRow) => {
    await fetch('/api/admin/landing-slides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...s, is_active: !s.is_active }) })
    load()
  }

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= slides.length) return
    const next = [...slides]; [next[i], next[j]] = [next[j], next[i]]
    setSlides(next)
    await fetch('/api/admin/landing-slides', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: next.map(s => s.id) }) })
  }

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true); setError('')
    try {
      const small = await resizeImage(file)
      const fd = new FormData(); fd.append('file', small)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const d = await res.json().catch(() => null)
      if (!res.ok || !d?.url) throw new Error(d?.error || 'Caricamento non riuscito')
      setForm(f => (f ? { ...f, image_url: d.url } : f))
    } catch (err: any) { setError(err?.message || 'Caricamento non riuscito') }
    setUploading(false)
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Le slide del carosello &quot;I nostri vantaggi&quot; nella landing, nell&apos;ordine mostrato qui.</p>
        {!form && <Button onClick={() => { setForm({ ...EMPTY }); setError('') }} className="gap-1 bg-orange-500 hover:bg-orange-600 shrink-0"><Plus className="w-4 h-4" />Nuova</Button>}
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {form && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">{form.id ? 'Modifica slide' : 'Nuova slide'}</p>
            <button onClick={() => { setForm(null); setError('') }} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
          </div>

          <div className="mx-auto w-full max-w-[340px]"><SlideCard slide={form} preview /></div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Titolo</label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Es. Lotteria a premi" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Testo</label>
            <textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Spiega il vantaggio in 1-2 frasi" />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Immagine (se la metti, sostituisce l&apos;emoji)</label>
            {form.image_url && (
              <div className="relative w-full h-28 rounded-xl overflow-hidden mb-2 border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setForm({ ...form, image_url: null })} className="absolute top-1.5 right-1.5 bg-white/90 rounded-full p-1 text-red-500"><X className="w-4 h-4" /></button>
              </div>
            )}
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 cursor-pointer">
              <ImagePlus className="w-4 h-4" />{uploading ? 'Caricamento...' : form.image_url ? 'Cambia foto' : 'Carica foto'}
              <input type="file" accept="image/*" className="hidden" onChange={onPickImage} disabled={uploading} />
            </label>
          </div>

          <div className="grid grid-cols-[90px_1fr] gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Emoji</label>
              <Input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} className="text-center text-xl" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Colore</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(GRADIENTS) as GradientKey[]).map(k => (
                  <button key={k} onClick={() => setForm({ ...form, gradient: k })} title={GRADIENTS[k].label}
                    className="w-9 h-9 rounded-full border-2" style={{ background: GRADIENTS[k].css, borderColor: form.gradient === k ? '#f97316' : 'transparent', boxShadow: form.gradient === k ? '0 0 0 2px #fed7aa' : undefined }} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Scritta del pulsante</label>
              <Input value={form.cta_label} onChange={e => setForm({ ...form, cta_label: e.target.value })} placeholder="Es. Partecipa" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Link del pulsante</label>
              <Input value={form.cta_link} onChange={e => setForm({ ...form, cta_link: e.target.value })} placeholder="/lotteria" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 -mt-1">Pulsante: compare solo se compili sia scritta sia link. Link utili: /shop, /promo, /lotteria, /volantino, /social, /recensioni.</p>

          <button onClick={() => setForm({ ...form, is_active: !form.is_active })} className="flex items-center gap-2 text-sm font-medium text-slate-700">
            {form.is_active ? <ToggleRight className="w-8 h-8 text-orange-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
            {form.is_active ? 'Visibile nel sito' : 'Nascosta'}
          </button>

          <Button onClick={save} disabled={saving || uploading} className="w-full bg-orange-500 hover:bg-orange-600">{saving ? 'Salvataggio...' : 'Salva slide'}</Button>
        </div>
      )}

      {slides.length === 0 && !form && <p className="text-center text-sm text-slate-400 py-6">Nessuna slide: il carosello non compare nella landing finché non ne aggiungi una.</p>}

      <div className="space-y-2">
        {slides.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white" style={{ opacity: s.is_active ? 1 : 0.55 }}>
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-3xl" style={{ background: (GRADIENTS[s.gradient as GradientKey] || GRADIENTS.viola).css }}>
              {s.image_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                : s.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800 truncate">{s.title}</p>
              <p className="text-xs text-slate-400 truncate">{s.text}</p>
            </div>
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-slate-400 disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => move(i, 1)} disabled={i === slides.length - 1} className="p-0.5 text-slate-400 disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button>
            </div>
            <button onClick={() => toggle(s)} title={s.is_active ? 'Nascondi' : 'Mostra'}>{s.is_active ? <ToggleRight className="w-7 h-7 text-orange-500" /> : <ToggleLeft className="w-7 h-7 text-slate-300" />}</button>
            <button onClick={() => { setForm({ id: s.id, title: s.title, text: s.text, emoji: s.emoji, gradient: s.gradient, image_url: s.image_url, cta_label: s.cta_label, cta_link: s.cta_link, is_active: s.is_active }); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="p-1.5 text-slate-500"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => remove(s)} className="p-1.5 text-red-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
