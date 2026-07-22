#!/bin/bash
set -e

# Esegui questo script dalla cartella del repo (cd ~/mgshop)

mkdir -p "lib"
cat > "lib/promo-custom-product.ts" << 'CUSTOMPROMOEOF'
import type { Product } from './types'

// Prefisso per i prodotti creati direttamente nella pagina Promo, che non
// esistono nella tabella "products" del negozio. Permette al carrello e al
// checkout di riconoscerli e trattarli diversamente da un prodotto vero
// (niente controllo di magazzino, niente vincolo di chiave esterna).
const CUSTOM_PROMO_PREFIX = 'promo-custom-'

export function createCustomPromoId(): string {
  return `${CUSTOM_PROMO_PREFIX}${crypto.randomUUID()}`
}

export function isCustomPromoProductId(id: string): boolean {
  return id.startsWith(CUSTOM_PROMO_PREFIX)
}

export function buildCustomPromoProduct(opts: { id: string; name: string; image_url: string | null; price: number }): Product {
  const now = new Date().toISOString()
  return {
    id: opts.id,
    name: opts.name,
    description: '',
    price: opts.price,
    category_id: null,
    cover_image: opts.image_url,
    is_active: true,
    stock: null,
    created_at: now,
    updated_at: now,
  }
}
CUSTOMPROMOEOF

mkdir -p "components/admin"
cat > "components/admin/promo-manager.tsx" << 'CUSTOMPROMOEOF'
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
    }])
    setCustomName(''); setCustomImageUrl(''); setCustomOriginalPrice(''); setCustomSalePrice(''); setShowCustomForm(false)
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
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-cyan-100 bg-cyan-50">
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
CUSTOMPROMOEOF

mkdir -p "app/promo"
cat > "app/promo/page.tsx" << 'CUSTOMPROMOEOF'
"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Tag, ShoppingBag, ShoppingCart, ImageIcon } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { Reveal } from '@/components/shop/reveal'
import { AmbientBubbles } from '@/components/shop/ambient-bubbles'
import { buildCustomPromoProduct } from '@/lib/promo-custom-product'

interface PromoItem {
  id: string
  product_id: string | null
  name?: string
  image_url?: string | null
  original_price?: number
  sale_price: number
}

interface PromoData {
  is_active: boolean; title: string; subtitle: string; content: string
  image_url: string; badge_text: string; expires_at: string; promo_items: PromoItem[]
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [t, setT] = useState({ days:0, hours:0, minutes:0, seconds:0 })
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    const calc = () => { const d = new Date(expiresAt).getTime()-Date.now(); if(d<=0){setExpired(true);return} setT({days:Math.floor(d/86400000),hours:Math.floor((d%86400000)/3600000),minutes:Math.floor((d%3600000)/60000),seconds:Math.floor((d%60000)/1000)}) }
    calc(); const i=setInterval(calc,1000); return ()=>clearInterval(i)
  },[expiresAt])
  if(expired) return <div className="text-center text-cyan-200/40 text-sm">Offerta scaduta</div>
  return (
    <div className="flex items-center justify-center gap-3">
      {[{v:t.days,l:'Giorni'},{v:t.hours,l:'Ore'},{v:t.minutes,l:'Min'},{v:t.seconds,l:'Sec'}].map(({v,l},i)=>(
        <div key={l} className="flex items-center gap-3">
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-2xl text-white" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',boxShadow:'0 4px 16px rgba(8,145,178,0.3)'}}>{String(v).padStart(2,'0')}</div>
            <p className="text-xs text-cyan-200/50 mt-1">{l}</p>
          </div>
          {i<3&&<span className="text-cyan-500 font-bold text-xl mb-4">:</span>}
        </div>
      ))}
    </div>
  )
}

function PromoProductCard({ product, salePrice }: { product: Product; salePrice: number }) {
  const addItem = useCartStore(s => s.addItem)
  const [added, setAdded] = useState(false)

  const hasDiscount = salePrice < product.price
  const percentOff = hasDiscount ? Math.round((1 - salePrice / product.price) * 100) : 0

  const handleAdd = () => {
    addItem({ ...product, price: salePrice })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
    toast.success(`${product.name} aggiunto!`, { style: { background: '#cffafe', border: '1px solid #0891b2', color: '#155e75' } })
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1 transition-all group"
      style={{ border: '1px solid rgba(8,145,178,0.1)', boxShadow: '0 4px 20px rgba(8,145,178,0.08)' }}>
      <Link href={`/prodotto/${product.id}`}>
        <div className="aspect-square overflow-hidden relative" style={{ background: 'linear-gradient(135deg,#f0fbfd,#cffafe)' }}>
          {product.cover_image
            ? <img src={product.cover_image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10" style={{color:'rgba(8,145,178,0.3)'}}/></div>}
          {hasDiscount && (
            <div className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#dc2626' }}>
              -{percentOff}%
            </div>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/prodotto/${product.id}`}>
          <h3 className="font-semibold text-sm text-slate-800 line-clamp-2 mb-2 hover:text-cyan-700 transition-colors">{product.name}</h3>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {hasDiscount ? (
              <>
                <span className="text-xs text-slate-400 line-through">€{product.price.toFixed(2)}</span>
                <span className="font-bold text-lg" style={{ color: '#dc2626' }}>€{salePrice.toFixed(2)}</span>
              </>
            ) : (
              <span className="font-bold text-lg" style={{ color: '#0891b2' }}>€{salePrice.toFixed(2)}</span>
            )}
          </div>
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all active:scale-95"
            style={{ background: added ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#0891b2,#06b6d4)', boxShadow: '0 4px 12px rgba(8,145,178,0.3)' }}>
            <ShoppingCart className="w-3.5 h-3.5" />
            {added ? 'Aggiunto!' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PromoPage() {
  const [promo, setPromo] = useState<PromoData|null>(null)
  const [displayItems, setDisplayItems] = useState<{ product: Product; salePrice: number }[]>([])
  const [loading, setLoading] = useState(true)
  const cartCount = useCartStore(s => s.getTotalItems)()

  useEffect(()=>{
    fetch('/api/promo', { cache: 'no-store' })
      .then(r=>r.json())
      .then(async d => {
        setPromo(d)
        const promoItems: PromoItem[] = d.promo_items || []
        const shopIds = promoItems.filter(i => i.product_id).map(i => i.product_id as string)
        let shopProducts: Product[] = []
        if (shopIds.length > 0) {
          const allProducts = await fetch('/api/admin/products').then(r=>r.json())
          shopProducts = allProducts.filter((p: Product) => shopIds.includes(p.id))
        }
        const built = promoItems.map(item => {
          if (item.product_id) {
            const p = shopProducts.find(sp => sp.id === item.product_id)
            return p ? { product: p, salePrice: item.sale_price } : null
          }
          const custom = buildCustomPromoProduct({
            id: item.id, name: item.name || 'Prodotto', image_url: item.image_url || null,
            price: item.original_price ?? item.sale_price,
          })
          return { product: custom, salePrice: item.sale_price }
        }).filter((x): x is { product: Product; salePrice: number } => !!x)
        setDisplayItems(built)
        setLoading(false)
      })
      .catch(()=>setLoading(false))
  },[])

  if(loading) return (
    <div className="min-h-screen" style={{background:'#f0fbfd'}}>
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div className="skeleton h-40 rounded-3xl" />
        <div className="skeleton h-10 w-2/3 mx-auto rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-square rounded-2xl" />)}
        </div>
      </div>
    </div>
  )

  if(!promo||!promo.is_active) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#f0fbfd'}}>
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{background:'rgba(8,145,178,0.08)',border:'2px dashed rgba(8,145,178,0.2)'}}><ShoppingBag className="w-12 h-12" style={{color:'rgba(8,145,178,0.4)'}}/></div>
        <h1 className="text-2xl font-bold mb-2" style={{color:'#0c2b36'}}>Nessuna promo attiva</h1>
        <p className="text-slate-400 mb-8">Torna presto per le nostre offerte!</p>
        <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-2xl text-white" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)'}}><ArrowLeft className="w-4 h-4"/> Vai al negozio</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#f0fbfd'}}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{background:'linear-gradient(135deg,#0c2b36,#06303d)'}}>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px] opacity-20" style={{background:'radial-gradient(circle,#0891b2,transparent)'}}/>
        <AmbientBubbles count={9} theme="dark" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="flex items-center justify-between mb-6">
            <Link href="/shop" className="inline-flex items-center gap-2 text-cyan-400/60 hover:text-cyan-300 text-sm transition-colors"><ArrowLeft className="w-4 h-4"/> Negozio</Link>
            <Link href="/carrello?promo=1" className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <ShoppingBag className="w-4 h-4"/>
              Carrello
              {cartCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-bold" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)'}}>{cartCount}</span>}
            </Link>
          </div>
          {promo.badge_text&&<div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-cyan-300 text-sm font-medium mb-4" style={{background:'rgba(8,145,178,0.15)',border:'1px solid rgba(8,145,178,0.3)'}}><Tag className="w-4 h-4"/> {promo.badge_text}</div>}
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">{promo.title}</h1>
          {promo.subtitle&&<p className="text-lg text-cyan-200/60 mb-6">{promo.subtitle}</p>}
          {promo.expires_at&&<div className="mb-4"><div className="flex items-center justify-center gap-2 text-cyan-400/60 text-sm mb-3"><Clock className="w-4 h-4"/> Offerta valida ancora per:</div><Countdown expiresAt={promo.expires_at}/></div>}
        </div>
      </div>

      {/* Content */}
      <div className="relative overflow-hidden">
        <AmbientBubbles count={16} theme="light" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 space-y-10">
          {(promo.image_url||promo.content)&&(
            <Reveal className={`grid gap-6 ${promo.image_url&&promo.content?'md:grid-cols-2':''}`}>
              {promo.image_url&&<div className="rounded-2xl overflow-hidden aspect-video" style={{boxShadow:'0 16px 40px rgba(8,145,178,0.12)'}}><img src={promo.image_url} alt="Promo" className="w-full h-full object-cover"/></div>}
              {promo.content&&<div className="flex items-center"><div className="bg-white rounded-2xl p-6 w-full" style={{border:'1px solid rgba(8,145,178,0.1)'}}><p className="text-slate-600 leading-relaxed whitespace-pre-line">{promo.content}</p></div></div>}
            </Reveal>
          )}

          {/* Prodotti in promo */}
          {displayItems.length > 0 && (
            <Reveal delay={100}>
              <h2 className="text-2xl font-bold mb-6" style={{color:'#0c2b36'}}>Prodotti in promozione</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 stagger-children">
                {displayItems.map(({ product, salePrice }) => (
                  <PromoProductCard key={product.id} product={product} salePrice={salePrice} />
                ))}
              </div>
              {/* Sticky cart button */}
              {cartCount > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-scale-in">
                  <Link href="/carrello?promo=1"
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold shadow-2xl transition-all hover:scale-105 neon-glow"
                    style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
                    <ShoppingBag className="w-5 h-5"/>
                    Vai al carrello ({cartCount})
                  </Link>
                </div>
              )}
            </Reveal>
          )}

          <Reveal delay={150} className="text-center py-6">
            <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-2xl text-white" style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',boxShadow:'0 12px 32px rgba(8,145,178,0.35)'}}>
              <ShoppingBag className="w-5 h-5"/> Vai al negozio completo
            </Link>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
CUSTOMPROMOEOF

mkdir -p "app/api/checkout"
cat > "app/api/checkout/route.ts" << 'CUSTOMPROMOEOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoArchiveIfExpired } from '@/lib/lottery'
import { LOTTERY_TICKET_PRODUCT_ID } from '@/lib/lottery-ticket-product'
import { isCustomPromoProductId } from '@/lib/promo-custom-product'

export async function POST(request: NextRequest) {
  try {
    const { phone_number, items, total, coupon_code } = await request.json()
    if (!phone_number || !items || items.length === 0)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const supabase = createAdminClient()

    // Il "biglietto lotteria" è una voce speciale nel carrello: non è un
    // prodotto vero (niente magazzino, niente riga in order_items). Che il
    // cliente compri solo biglietti o li aggiunga insieme ad altri prodotti,
    // il meccanismo di assegnazione dei numeri è sempre lo stesso.
    const ticketItem = items.find((i: { product: { id: string } }) => i.product.id === LOTTERY_TICKET_PRODUCT_ID)
    const ticketQty = ticketItem ? Math.max(0, parseInt(ticketItem.quantity) || 0) : 0
    const realItems = items.filter((i: { product: { id: string } }) => i.product.id !== LOTTERY_TICKET_PRODUCT_ID)

    let lottery: any = null
    if (ticketQty > 0) {
      const { data: lotteryRow } = await supabase.from('lottery').select('*').limit(1).single()
      lottery = lotteryRow ? await autoArchiveIfExpired(supabase, lotteryRow) : null
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ phone_number, total, status: 'pending', is_ticket_only: realItems.length === 0 })
      .select().single()
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

    let ticketNumbers: number[] = []
    if (ticketQty > 0 && lottery?.is_active && lottery.round_id) {
      const [{ count: orderCount }, { count: existingTicketCount }] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .eq('lottery_round', lottery.round_id).not('lottery_number', 'is', null),
        supabase.from('lottery_tickets').select('id', { count: 'exact', head: true })
          .eq('round_id', lottery.round_id),
      ])
      const start = (orderCount || 0) + (existingTicketCount || 0) + 1
      ticketNumbers = Array.from({ length: ticketQty }, (_, i) => start + i)
      await supabase.from('lottery_tickets').insert(
        ticketNumbers.map(n => ({
          round_id: lottery.round_id,
          lottery_number: n,
          order_id: order.id,
          phone_number,
        }))
      )
    }

    if (realItems.length > 0) {
      const orderItems = realItems.map((item: { product: { id: string; name: string; price: number }; quantity: number }) => ({
        order_id: order.id,
        // I prodotti creati apposta per una promo (non presenti nel negozio)
        // non hanno una riga vera in "products": mettere qui il loro id
        // finto violerebbe il vincolo di chiave esterna. Nome e prezzo
        // restano comunque salvati sull'ordine per lo storico.
        product_id: isCustomPromoProductId(item.product.id) ? null : item.product.id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
      }))
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

      // Scala le quantità dal magazzino (solo per i prodotti veri, quelli
      // personalizzati della promo non hanno un magazzino da scalare)
      for (const item of realItems) {
        if (isCustomPromoProductId(item.product.id)) continue
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product.id)
          .single()
        if (product && product.stock !== null) {
          const newStock = Math.max(0, product.stock - item.quantity)
          await supabase.from('products').update({ stock: newStock }).eq('id', item.product.id)
        }
      }
    }

    if (coupon_code) {
      const { data: coupon } = await supabase.from('coupons').select('id, uses_count').eq('code', coupon_code).single()
      if (coupon) await supabase.from('coupons').update({ uses_count: coupon.uses_count + 1 }).eq('id', coupon.id)
    }

    // Notifica push
    const itemsCount = realItems.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)
    const notifBody = ticketQty > 0
      ? `${phone_number} — ${itemsCount} articoli + ${ticketQty} bigliett${ticketQty > 1 ? 'i' : 'o'} lotteria — €${total.toFixed(2)}`
      : `${phone_number} — ${itemsCount} articoli — €${total.toFixed(2)}`
    const baseUrl = request.headers.get('origin') || 'https://mgshop-2.vercel.app'
    fetch(`${baseUrl}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Nuovo ordine ricevuto!',
        body: notifBody,
        url: '/mgadmin-panel'
      })
    }).catch(() => {})

    return NextResponse.json({ success: true, order, ticket_numbers: ticketNumbers })
  } catch {
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
CUSTOMPROMOEOF

git add -A
git commit -m "feat: prodotti personalizzati in Promo (non presenti nel negozio), acquistabili dal carrello"
git push
