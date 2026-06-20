"use client"

import { useState, useEffect } from 'react'
import { ToggleLeft, ToggleRight, ImageIcon, Save, Eye, Clock, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function PromoManager() {
  const [isActive, setIsActive] = useState(false)
  const [title, setTitle] = useState('Le nostre promozioni')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [badgeText, setBadgeText] = useState('Offerta speciale')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/promo', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setIsActive(d.is_active === true)
        setTitle(d.title || '')
        setSubtitle(d.subtitle || '')
        setContent(d.content || '')
        setImageUrl(d.image_url || '')
        setBadgeText(d.badge_text || '')
        setExpiresAt(d.expires_at ? d.expires_at.slice(0, 16) : '')
        setLoading(false)
      })
      .catch(() => { setError('Errore caricamento'); setLoading(false) })
  }, [])

  const saveData = async (data: object) => {
    const res = await fetch('/api/admin/promo', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.ok
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const ok = await saveData({
      is_active: isActive, title, subtitle, content,
      image_url: imageUrl, badge_text: badgeText,
      expires_at: expiresAt || null
    })
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    else setError('Errore salvataggio — riprova')
    setSaving(false)
  }

  const handleToggle = async () => {
    const newValue = !isActive
    setIsActive(newValue)
    const ok = await saveData({ is_active: newValue })
    if (!ok) setIsActive(!newValue)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: formData })
      const data = await res.json()
      if (data.url) setImageUrl(data.url)
    } catch { console.error('Upload failed') }
    setUploading(false)
  }

  if (loading) return <div className="text-center py-8 text-stone-400">Caricamento...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between p-4 rounded-2xl border"
        style={{ background: isActive ? 'rgba(217,119,6,0.06)' : 'rgba(0,0,0,0.02)', borderColor: isActive ? 'rgba(217,119,6,0.2)' : 'rgba(0,0,0,0.08)' }}>
        <div>
          <p className="font-semibold text-stone-800">Pagina Promo</p>
          <p className="text-xs mt-0.5">
            {isActive
              ? <span className="text-amber-600 font-medium">✅ Attiva — visibile su /promo</span>
              : <span className="text-stone-400">❌ Disattivata</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <Link href="/promo" target="_blank" className="flex items-center gap-1.5 text-xs text-amber-700 font-medium px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors">
              <Eye className="w-3.5 h-3.5" /> Vedi pagina
            </Link>
          )}
          <button onClick={handleToggle} className="focus:outline-none hover:scale-110 transition-transform">
            {isActive ? <ToggleRight className="w-10 h-10 text-amber-600" /> : <ToggleLeft className="w-10 h-10 text-stone-300" />}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Badge</label>
          <Input value={badgeText} onChange={e => setBadgeText(e.target.value)} placeholder="Offerta speciale" />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Titolo *</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. Saldi estivi 🔥" />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Sottotitolo</label>
          <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Es. Fino al 50% su tutti i detersivi" />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Contenuto</label>
          <textarea value={content} onChange={e => setContent(e.target.value)}
            className="w-full border border-stone-200 rounded-lg p-3 text-sm resize-none h-32 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Descrizione promo..." />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Immagine</label>
          <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="URL immagine" className="mb-2" />
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-amber-700 font-medium">
            <ImageIcon className="w-4 h-4" /> {uploading ? 'Caricamento...' : 'Carica file'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
          </label>
          {imageUrl && <div className="mt-2 rounded-xl overflow-hidden h-32 bg-stone-100"><img src={imageUrl} alt="preview" className="w-full h-full object-cover" /></div>}
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Scadenza (conto alla rovescia)</label>
          <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-amber-600 hover:bg-amber-700">
        <Save className="w-4 h-4" />
        {saved ? '✓ Salvato!' : saving ? 'Salvataggio...' : 'Salva modifiche'}
      </Button>
    </div>
  )
}
