"use client"

import { useState, useEffect } from 'react'
import { ToggleLeft, ToggleRight, ImageIcon, Save, Eye, Clock, Tag, Plus, X, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Product } from '@/lib/types'
import { ImageCropper } from './image-cropper'

export function PromoManager() {
  const [isActive, setIsActive] = useState(false)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [badgeText, setBadgeText] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [featuredIds, setFeaturedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropAspect, setCropAspect] = useState(16 / 9)
  const [productSearch, setProductSearch] = useState('')
  const [showProductPicker, setShowProductPicker] = useState(false)

  useEffect(() => {
    fetch('/api/admin/promo')
      .then(r => r.json())
      .then(d => {
        setIsActive(d.is_active === true)
        setTitle(d.title || '')
        setSubtitle(d.subtitle || '')
        setContent(d.content || '')
        setImageUrl(d.image_url || '')
        setBadgeText(d.badge_text || '')
        setExpiresAt(d.expires_at ? d.expires_at.slice(0, 16) : '')
        setFeaturedIds(d.featured_product_ids || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
    fetch('/api/admin/products')
      .then(r => r.json())
      .then(setAllProducts)
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_active: isActive, title, subtitle, content,
        image_url: imageUrl || null, badge_text: badgeText,
        expires_at: expiresAt || null,
        featured_product_ids: featuredIds
      })
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    else setError('Errore salvataggio')
    setSaving(false)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCropFile(file)
    e.target.value = ''
  }

  const handleCropConfirm = async (blob: Blob) => {
    setCropFile(null)
    setUploading(true)
    try {
      const croppedFile = new File([blob], 'promo.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', croppedFile)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setImageUrl(data.url)
    } catch { console.error('Upload failed') }
    setUploading(false)
  }

  const handleCropCancel = () => setCropFile(null)

  const toggleProduct = (id: string) => {
    setFeaturedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const featuredProducts = allProducts.filter(p => featuredIds.includes(p.id))

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex items-center justify-between p-4 rounded-2xl border"
        style={{ background: isActive ? 'rgba(8,145,178,0.06)' : 'rgba(0,0,0,0.02)', borderColor: isActive ? 'rgba(8,145,178,0.2)' : 'rgba(0,0,0,0.08)' }}>
        <div>
          <p className="font-semibold text-slate-800">Pagina Promo</p>
          <p className="text-xs mt-0.5">
            {isActive ? <span className="text-cyan-600 font-medium">Attiva — ricordati di salvare!</span> : <span className="text-slate-400">Disattivata — ricordati di salvare!</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <Link href="/promo" target="_blank" className="flex items-center gap-1.5 text-xs text-cyan-700 font-medium px-3 py-1.5 rounded-lg border border-cyan-200 hover:bg-cyan-50">
              <Eye className="w-3.5 h-3.5" /> Vedi
            </Link>
          )}
          <button onClick={() => setIsActive(v => !v)} className="focus:outline-none hover:scale-110 transition-transform">
            {isActive ? <ToggleRight className="w-10 h-10 text-cyan-600" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
          </button>
        </div>
      </div>

      <div className="p-3 rounded-xl text-xs text-cyan-700 font-medium" style={{ background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.15)' }}>
        Dopo ogni modifica clicca Salva modifiche
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Badge</label>
          <Input value={badgeText} onChange={e => setBadgeText(e.target.value)} placeholder="Offerta speciale" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Titolo</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. Saldi estivi" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Sottotitolo</label>
          <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Es. Fino al 50% di sconto" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Contenuto</label>
          <textarea value={content} onChange={e => setContent(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Descrizione promo..." />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Immagine</label>
          <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="URL immagine" className="mb-2" />
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[
              { label: 'Panoramico 3:1', value: 3 },
              { label: 'Largo 16:9', value: 16 / 9 },
              { label: 'Standard 4:3', value: 4 / 3 },
              { label: 'Quadrato 1:1', value: 1 },
              { label: 'Verticale 4:5', value: 4 / 5 },
            ].map(opt => (
              <button key={opt.label} type="button" onClick={() => setCropAspect(opt.value)}
                className="text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors"
                style={cropAspect === opt.value
                  ? { background: 'rgba(8,145,178,0.12)', borderColor: 'rgba(8,145,178,0.4)', color: '#0e7490' }
                  : { background: 'transparent', borderColor: 'rgba(0,0,0,0.1)', color: '#78716c' }}>
                {opt.label}
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-cyan-700 font-medium">
            <ImageIcon className="w-4 h-4" /> {uploading ? 'Caricamento...' : 'Carica file'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} disabled={uploading} />
          </label>
          {imageUrl && (
            <div className="mt-2 relative">
              <div className="rounded-xl overflow-hidden h-28 bg-slate-100"><img src={imageUrl} alt="preview" className="w-full h-full object-cover" /></div>
              <button onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg">Rimuovi</button>
            </div>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Scadenza</label>
          <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          {expiresAt && <button onClick={() => setExpiresAt('')} className="text-xs text-red-500 mt-1">Rimuovi scadenza</button>}
        </div>

        {/* Prodotti in evidenza */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-500">Prodotti in promozione ({featuredIds.length})</label>
            <button onClick={() => setShowProductPicker(v => !v)}
              className="flex items-center gap-1 text-xs text-cyan-700 font-medium px-3 py-1.5 rounded-lg border border-cyan-200 hover:bg-cyan-50 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Aggiungi prodotti
            </button>
          </div>

          {/* Prodotti selezionati */}
          {featuredProducts.length > 0 && (
            <div className="space-y-2 mb-3">
              {featuredProducts.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl border border-cyan-100 bg-cyan-50">
                  {p.cover_image && <img src={p.cover_image} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-cyan-700 font-bold">euro{p.price.toFixed(2)}</p>
                  </div>
                  <button onClick={() => toggleProduct(p.id)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Product picker */}
          {showProductPicker && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="Cerca prodotto..." className="pl-9 h-9 text-sm" />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => toggleProduct(p.id)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 ${featuredIds.includes(p.id) ? 'bg-cyan-50' : ''}`}>
                    {p.cover_image
                      ? <img src={p.cover_image} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      : <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-cyan-700">euro{p.price.toFixed(2)}</p>
                    </div>
                    {featuredIds.includes(p.id) && <span className="text-xs text-cyan-600 font-bold shrink-0">Selezionato</span>}
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-slate-100">
                <button onClick={() => setShowProductPicker(false)} className="w-full text-sm text-slate-500 py-1">Chiudi</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700 text-base py-6">
        <Save className="w-5 h-5" />
        {saved ? 'Salvato!' : saving ? 'Salvataggio...' : 'Salva modifiche'}
      </Button>
      {cropFile && (
        <ImageCropper
          file={cropFile}
          aspectRatio={cropAspect}
          outputWidth={1800}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  )
}
