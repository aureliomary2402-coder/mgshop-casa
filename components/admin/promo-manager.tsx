"use client"

import { useState, useEffect } from 'react'
import { ToggleLeft, ToggleRight, ImageIcon, Save, Eye, Clock, Tag, Plus, X, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Product } from '@/lib/types'
import { ImageCropper } from './image-cropper'
import { createCustomPromoId } from '@/lib/promo-custom-product'

interface PromoItem {
  id: string
  product_id: string | null
  name?: string
  image_url?: string | null
  original_price?: number
  sale_price: number
  description?: string
}

export function PromoManager() {
  const [isActive, setIsActive] = useState(false)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [badgeText, setBadgeText] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [items, setItems] = useState<PromoItem[]>([])
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
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({})

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
        setItems(d.promo_items || [])
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
        promo_items: items,
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

  const addProduct = (product: Product) => {
    if (items.some(i => i.product_id === product.id)) return
    setItems(prev => [...prev, { id: product.id, product_id: product.id, sale_price: product.price }])
  }

  const removeProduct = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    setPriceDrafts(prev => {
      const { [id]: _, ...rest } = prev
      return rest
    })
  }

  const updateSalePrice = (id: string, raw: string) => {
    // Normalizza virgola -> punto e tiene solo cifre + un separatore decimale,
    // così il campo non "salta" mentre l'utente sta ancora scrivendo (es. "12," o "12.")
    let cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('')

    setPriceDrafts(prev => ({ ...prev, [id]: cleaned }))

    const val = parseFloat(cleaned)
    setItems(prev => prev.map(i => i.id === id ? { ...i, sale_price: isNaN(val) ? 0 : val } : i))
  }

  // --- Prodotti personalizzati: non esistono nel negozio, si creano solo qui ---
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customImageUrl, setCustomImageUrl] = useState('')
  const [customOriginalPrice, setCustomOriginalPrice] = useState('')
  const [customSalePrice, setCustomSalePrice] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [customUploading, setCustomUploading] = useState(false)

  const handleCustomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCustomUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setCustomImageUrl(data.url)
    } catch { console.error('Upload failed') }
    setCustomUploading(false)
  }

  const addCustomProduct = () => {
    if (!customName.trim()) return
    const original = parseFloat(customOriginalPrice.replace(',', '.'))
    const sale = parseFloat(customSalePrice.replace(',', '.'))
    setItems(prev => [...prev, {
      id: createCustomPromoId(),
      product_id: null,
      name: customName.trim(),
      image_url: customImageUrl || null,
      original_price: isNaN(original) ? (isNaN(sale) ? 0 : sale) : original,
      sale_price: isNaN(sale) ? 0 : sale,
      description: customDescription.trim() || undefined,
    }])
    setCustomName(''); setCustomImageUrl(''); setCustomOriginalPrice(''); setCustomSalePrice(''); setCustomDescription(''); setShowCustomForm(false)
  }

  // Aggiorna la descrizione/informazioni aggiuntive di un item già in lista
  // (sia personalizzato che preso dal negozio): è quella che il cliente
  // vede quando apre la scheda del prodotto dalla pagina promo.
  const updateDescription = (id: string, text: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, description: text } : i))
  }

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  // Per i prodotti del negozio, nome/immagine/prezzo originale arrivano dal
  // catalogo (sempre aggiornati); per quelli personalizzati sono quelli
  // scritti a mano qui, perché non esiste nessun prodotto a cui collegarsi.
  const itemProducts = items.map(item => {
    if (item.product_id) {
      const product = allProducts.find(p => p.id === item.product_id)
      if (!product) return null
      return { item, name: product.name, image: product.cover_image, originalPrice: product.price, isCustom: false }
    }
    return { item, name: item.name || 'Prodotto personalizzato', image: item.image_url || null, originalPrice: item.original_price ?? item.sale_price, isCustom: true }
  }).filter((x): x is { item: PromoItem; name: string; image: string | null; originalPrice: number; isCustom: boolean } => !!x)

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
            <label className="text-xs font-medium text-slate-500">Prodotti in promozione ({items.length})</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowCustomForm(v => !v)}
                className="flex items-center gap-1 text-xs text-amber-700 font-medium px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Prodotto personalizzato
              </button>
              <button onClick={() => setShowProductPicker(v => !v)}
                className="flex items-center gap-1 text-xs text-cyan-700 font-medium px-3 py-1.5 rounded-lg border border-cyan-200 hover:bg-cyan-50 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Dal negozio
              </button>
            </div>
          </div>

          {/* Form prodotto personalizzato: non esiste nel negozio, si crea solo qui */}
          {showCustomForm && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 mb-3 space-y-2.5">
              <p className="text-xs text-amber-700 font-medium">Prodotto solo per questa promo, non è nel negozio</p>
              <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Nome prodotto" className="bg-white" />
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-cyan-700 font-medium px-3 py-2 rounded-lg border border-cyan-200 bg-white shrink-0">
                  <ImageIcon className="w-3.5 h-3.5" /> {customUploading ? 'Caricamento...' : 'Immagine'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleCustomImageUpload} disabled={customUploading} />
                </label>
                {customImageUrl && <img src={customImageUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[11px] text-slate-500 block mb-0.5">Prezzo originale (sbarrato)</label>
                  <Input value={customOriginalPrice} onChange={e => setCustomOriginalPrice(e.target.value)} inputMode="decimal" placeholder="€" className="bg-white" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-red-600 block mb-0.5">Nuovo prezzo promo</label>
                  <Input value={customSalePrice} onChange={e => setCustomSalePrice(e.target.value)} inputMode="decimal" placeholder="€" className="bg-white font-bold text-red-600" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-0.5">Descrizione / informazioni (facoltativo)</label>
                <textarea value={customDescription} onChange={e => setCustomDescription(e.target.value)}
                  className="w-full border border-amber-200 bg-white rounded-lg p-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Cosa deve sapere il cliente su questo prodotto..." />
              </div>
              <div className="flex gap-2">
                <button onClick={addCustomProduct} disabled={!customName.trim()}
                  className="flex-1 text-sm font-bold text-white py-2 rounded-lg disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>
                  Aggiungi alla promo
                </button>
                <button onClick={() => setShowCustomForm(false)} className="text-xs text-slate-400 px-2">Annulla</button>
              </div>
            </div>
          )}

          {/* Prodotti selezionati, con prezzo originale e nuovo prezzo modificabile */}
          {itemProducts.length > 0 && (
            <div className="space-y-2 mb-3">
              {itemProducts.map(({ item, name, image, originalPrice, isCustom }) => (
                <div key={item.id} className="p-2.5 rounded-xl border border-cyan-100 bg-cyan-50 space-y-2">
                  <div className="flex items-center gap-3">
                    {image ? <img src={image} alt={name} className="w-12 h-12 rounded-lg object-cover shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-slate-200 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{name}{isCustom && <span className="ml-1.5 text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">personalizzato</span>}</p>
                      <p className="text-xs text-slate-400 line-through">€{originalPrice.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Tag className="w-3.5 h-3.5 text-red-500" />
                      <Input
                        type="text" inputMode="decimal"
                        value={priceDrafts[item.id] ?? String(item.sale_price)}
                        onChange={e => updateSalePrice(item.id, e.target.value)}
                        className="w-20 h-9 text-sm font-bold text-red-600"
                      />
                    </div>
                    <button onClick={() => removeProduct(item.id)} className="p-1 hover:bg-red-100 rounded-lg transition-colors shrink-0">
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                  <textarea value={item.description || ''} onChange={e => updateDescription(item.id, e.target.value)}
                    className="w-full border border-cyan-200 bg-white rounded-lg p-2 text-xs resize-none h-12 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="Informazioni aggiuntive per questo prodotto (facoltativo) — il cliente le vede aprendo la scheda dalla pagina promo" />
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
                {filteredProducts.map(p => {
                  const already = items.some(i => i.product_id === p.id)
                  return (
                    <button key={p.id} onClick={() => addProduct(p)} disabled={already}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 ${already ? 'opacity-40' : ''}`}>
                      {p.cover_image
                        ? <img src={p.cover_image} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        : <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                        <p className="text-xs text-cyan-700">€{p.price.toFixed(2)}</p>
                      </div>
                      {already && <span className="text-xs text-slate-400 font-bold shrink-0">Aggiunto</span>}
                    </button>
                  )
                })}
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
