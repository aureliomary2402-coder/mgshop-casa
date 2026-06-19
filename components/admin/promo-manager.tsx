"use client"

import { useState, useEffect } from 'react'
import { ToggleLeft, ToggleRight, ImageIcon, Save, Eye, Clock, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PromoData {
  id: string; is_active: boolean; title: string; subtitle: string
  content: string; image_url: string; badge_text: string; expires_at: string
}

export function PromoManager() {
  const [promo, setPromo] = useState<PromoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { fetch('/api/admin/promo').then(r=>r.json()).then(d=>{setPromo(d);setLoading(false)}) }, [])

  const handleSave = async () => {
    if (!promo) return
    setSaving(true)
    await fetch('/api/admin/promo', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(promo) })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const handleToggle = async () => {
    if (!promo) return
    const updated = { ...promo, is_active: !promo.is_active }
    setPromo(updated)
    await fetch('/api/admin/promo', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ is_active: updated.is_active }) })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !promo) return
    setUploading(true)
    const formData = new FormData(); formData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setPromo(p => p ? { ...p, image_url: data.url } : p)
    } catch { console.error('Upload failed') }
    setUploading(false)
  }

  if (loading) return <div className="text-center py-8 text-stone-400">Caricamento...</div>
  if (!promo) return <div className="text-center py-8 text-red-400 text-sm">Errore — esegui prima il file promo_schema.sql su Supabase</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between p-4 rounded-2xl border"
        style={{background: promo.is_active ? 'rgba(217,119,6,0.06)' : 'rgba(0,0,0,0.02)', borderColor: promo.is_active ? 'rgba(217,119,6,0.2)' : 'rgba(0,0,0,0.08)'}}>
        <div>
          <p className="font-semibold text-stone-800">Pagina Promo</p>
          <p className="text-xs mt-0.5">
            {promo.is_active ? <span className="text-amber-600 font-medium">✅ Attiva — visibile su /promo</span> : <span className="text-stone-400">❌ Disattivata</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {promo.is_active && (
            <Link href="/promo" target="_blank" className="flex items-center gap-1.5 text-xs text-amber-700 font-medium px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors">
              <Eye className="w-3.5 h-3.5"/> Vedi pagina
            </Link>
          )}
          <button onClick={handleToggle} className="focus:outline-none hover:scale-110 transition-transform">
            {promo.is_active ? <ToggleRight className="w-10 h-10 text-amber-600"/> : <ToggleLeft className="w-10 h-10 text-stone-300"/>}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 flex items-center gap-1"><Tag className="w-3.5 h-3.5"/> Badge (es. "Solo oggi")</label>
          <Input value={promo.badge_text||''} onChange={e=>setPromo(p=>p?{...p,badge_text:e.target.value}:p)} placeholder="Offerta speciale"/>
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Titolo *</label>
          <Input value={promo.title} onChange={e=>setPromo(p=>p?{...p,title:e.target.value}:p)} placeholder="Es. Saldi estivi 🔥"/>
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Sottotitolo</label>
          <Input value={promo.subtitle||''} onChange={e=>setPromo(p=>p?{...p,subtitle:e.target.value}:p)} placeholder="Es. Fino al 50% su tutti i detersivi"/>
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Contenuto / Descrizione</label>
          <textarea value={promo.content||''} onChange={e=>setPromo(p=>p?{...p,content:e.target.value}:p)}
            className="w-full border border-stone-200 rounded-lg p-3 text-sm resize-none h-32 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Descrizione promo, condizioni, prodotti..."/>
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Immagine</label>
          <Input value={promo.image_url||''} onChange={e=>setPromo(p=>p?{...p,image_url:e.target.value}:p)} placeholder="URL immagine" className="mb-2"/>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-amber-700 font-medium">
            <ImageIcon className="w-4 h-4"/> {uploading ? 'Caricamento...' : 'Carica file'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading}/>
          </label>
          {promo.image_url && <div className="mt-2 rounded-xl overflow-hidden h-32 bg-stone-100"><img src={promo.image_url} alt="preview" className="w-full h-full object-cover"/></div>}
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> Scadenza (mostra conto alla rovescia)</label>
          <Input type="datetime-local" value={promo.expires_at?promo.expires_at.slice(0,16):''} onChange={e=>setPromo(p=>p?{...p,expires_at:e.target.value}:p)}/>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-amber-600 hover:bg-amber-700">
        <Save className="w-4 h-4"/>
        {saved ? '✓ Salvato!' : saving ? 'Salvataggio...' : 'Salva modifiche'}
      </Button>
    </div>
  )
}
