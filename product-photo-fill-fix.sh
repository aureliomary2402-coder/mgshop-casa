#!/bin/bash
set -e

# Esegui questo script dalla cartella del repo (cd ~/mgshop)

mkdir -p "components/admin"
cat > "components/admin/image-cropper.tsx" << 'CROPEOF'
"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Check, ZoomIn } from 'lucide-react'

interface ImageCropperProps {
  file: File
  onCancel: () => void
  onConfirm: (blob: Blob) => void
  outputWidth?: number // risoluzione in pixel della larghezza esportata
  aspectRatio?: number // larghezza/altezza del riquadro. 1 = quadrato, 3 = panoramico tipo banner
  minZoom?: number // zoom minimo consentito. 1 = non si può rimpicciolire sotto la misura che riempie il riquadro (niente bordi vuoti)
}

const VIEWPORT_W = 320
const MIN_ZOOM = 0.2
const MAX_ZOOM = 4
const EDGE_MARGIN = 24 // px minimi di immagine che devono restare visibili, per non perderla trascinandola fuori

// Rileva il colore medio ai bordi della foto, per usarlo come sfondo automatico
function detectEdgeColor(img: HTMLImageElement): string {
  try {
    const sampleSize = 60
    const canvas = document.createElement('canvas')
    canvas.width = sampleSize
    canvas.height = sampleSize
    const ctx = canvas.getContext('2d')
    if (!ctx) return '#ffffff'
    ctx.drawImage(img, 0, 0, sampleSize, sampleSize)
    const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize)
    let r = 0, g = 0, b = 0, count = 0
    const border = Math.max(2, Math.round(sampleSize * 0.08))
    for (let y = 0; y < sampleSize; y++) {
      for (let x = 0; x < sampleSize; x++) {
        const onEdge = x < border || x >= sampleSize - border || y < border || y >= sampleSize - border
        if (!onEdge) continue
        const i = (y * sampleSize + x) * 4
        r += data[i]; g += data[i + 1]; b += data[i + 2]
        count++
      }
    }
    if (count === 0) return '#ffffff'
    r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count)
    return `rgb(${r},${g},${b})`
  } catch {
    return '#ffffff'
  }
}

export function ImageCropper({ file, onCancel, onConfirm, outputWidth = 1600, aspectRatio = 1, minZoom = MIN_ZOOM }: ImageCropperProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [processing, setProcessing] = useState(false)
  const [bgColor, setBgColor] = useState('#ffffff')
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; offX: number; offY: number }>({
    dragging: false, startX: 0, startY: 0, offX: 0, offY: 0,
  })

  const viewportH = Math.round(VIEWPORT_W / aspectRatio)
  const fillFrame = minZoom >= 1
  const computeBaseScale = useCallback((w: number, h: number) => (
    fillFrame ? Math.max(VIEWPORT_W / w, viewportH / h) : Math.min(VIEWPORT_W / w, viewportH / h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [fillFrame, viewportH])

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setImg(image)
      setBgColor(detectEdgeColor(image))
      const bs = computeBaseScale(image.naturalWidth, image.naturalHeight)
      const dW = image.naturalWidth * bs
      const dH = image.naturalHeight * bs
      setZoom(1)
      setOffset({ x: (VIEWPORT_W - dW) / 2, y: (viewportH - dH) / 2 })
    }
    image.src = url
    return () => URL.revokeObjectURL(url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const baseScale = img ? computeBaseScale(img.naturalWidth, img.naturalHeight) : 1
  const displayScale = baseScale * zoom
  const dispW = img ? img.naturalWidth * displayScale : 0
  const dispH = img ? img.naturalHeight * displayScale : 0

  // Permette di spostare l'immagine anche oltre i bordi del riquadro,
  // lasciando comunque un margine minimo visibile per non perderla del tutto
  const clamp = useCallback((off: { x: number; y: number }, w: number, h: number) => {
    const minX = Math.min(-(w - EDGE_MARGIN), VIEWPORT_W - EDGE_MARGIN)
    const maxX = Math.max(-(w - EDGE_MARGIN), VIEWPORT_W - EDGE_MARGIN)
    const minY = Math.min(-(h - EDGE_MARGIN), viewportH - EDGE_MARGIN)
    const maxY = Math.max(-(h - EDGE_MARGIN), viewportH - EDGE_MARGIN)
    return {
      x: Math.max(minX, Math.min(maxX, off.x)),
      y: Math.max(minY, Math.min(maxY, off.y)),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportH])

  const startDrag = (clientX: number, clientY: number) => {
    dragState.current = { dragging: true, startX: clientX, startY: clientY, offX: offset.x, offY: offset.y }
  }
  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragState.current.dragging) return
    const dx = clientX - dragState.current.startX
    const dy = clientY - dragState.current.startY
    setOffset(clamp({ x: dragState.current.offX + dx, y: dragState.current.offY + dy }, dispW, dispH))
  }
  const endDrag = () => { dragState.current.dragging = false }

  // Zoom centrato sul centro del riquadro, mantenendo la posizione relativa dell'immagine
  const handleZoomChange = (newZoom: number) => {
    if (!img) { setZoom(newZoom); return }
    const oldScale = baseScale * zoom
    const newScale = baseScale * newZoom
    const ratio = newScale / oldScale
    const newW = img.naturalWidth * newScale
    const newH = img.naturalHeight * newScale
    setOffset(o => clamp({
      x: VIEWPORT_W / 2 - (VIEWPORT_W / 2 - o.x) * ratio,
      y: viewportH / 2 - (viewportH / 2 - o.y) * ratio,
    }, newW, newH))
    setZoom(newZoom)
  }

  const handleConfirm = () => {
    if (!img) return
    setProcessing(true)
    const outH = Math.round(outputWidth / aspectRatio)
    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) { setProcessing(false); return }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Riempie con il colore rilevato dalla foto, così lo spazio lasciato libero si intona invece di essere un bianco piatto
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, outputWidth, outH)

    const outputScale = outputWidth / VIEWPORT_W
    const drawW = dispW * outputScale
    const drawH = dispH * outputScale
    const drawX = offset.x * outputScale
    const drawY = offset.y * outputScale

    ctx.drawImage(img, drawX, drawY, drawW, drawH)
    canvas.toBlob((blob) => {
      setProcessing(false)
      if (blob) onConfirm(blob)
    }, 'image/jpeg', 0.95)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Ritaglia immagine</h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div
          className="relative mx-auto rounded-xl overflow-hidden border border-slate-200 select-none touch-none"
          style={{ width: VIEWPORT_W, height: viewportH, cursor: 'grab', background: bgColor }}
          onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
          onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={endDrag}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ width: dispW, height: dispH, transform: `translate(${offset.x}px, ${offset.y}px)` }}
            />
          )}
          {/* Griglia guida */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)',
            backgroundSize: `${VIEWPORT_W / 3}px ${viewportH / 3}px`,
          }} />
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="range" min={minZoom} max={MAX_ZOOM} step="0.01"
            value={zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-600"
          />
        </div>
        <p className="text-xs text-slate-400 text-center -mt-2">
          {minZoom >= 1
            ? 'Trascina per spostare, usa lo slider per ingrandire. Il riquadro resta sempre pieno, senza bordi vuoti.'
            : 'Trascina per spostare, usa lo slider per rimpicciolire o ingrandire. Lo spazio vuoto si riempie da solo con il colore della foto.'}
        </p>

        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors">
            Annulla
          </button>
          <button onClick={handleConfirm} disabled={!img || processing}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
            <Check className="w-4 h-4" /> {processing ? 'Elaborazione...' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  )
}
CROPEOF

mkdir -p "components/admin"
cat > "components/admin/products-manager.tsx" << 'CROPEOF'
"use client"

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Images, ToggleLeft, ToggleRight, ImageIcon, Search, X, Package, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductImagesManager } from './product-images-manager'
import { ImageCropper } from './image-cropper'
import type { Product, Category } from '@/lib/types'

function StockBadge({ stock }: { stock: number | null }) {
  if (stock === null || stock === undefined) return (
    <span className="text-xs text-slate-400">Illimitato</span>
  )
  if (stock === 0) return (
    <span className="text-xs font-semibold text-red-500 flex items-center gap-0.5">
      <AlertTriangle className="w-3 h-3" /> Esaurito
    </span>
  )
  if (stock <= 5) return (
    <span className="text-xs font-semibold text-sky-500 flex items-center gap-0.5">
      <AlertTriangle className="w-3 h-3" /> {stock} rimasti
    </span>
  )
  return <span className="text-xs text-green-600 font-medium">{stock} disponibili</span>
}

export function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [managingImagesFor, setManagingImagesFor] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '', cover_image: '', is_active: true, stock: '' })
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverCropFile, setCoverCropFile] = useState<File | null>(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStock, setFilterStock] = useState<'all' | 'low' | 'out'>('all')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [p, c] = await Promise.all([
      fetch('/api/admin/products').then(r => r.json()),
      fetch('/api/admin/categories').then(r => r.json()),
    ])
    setProducts(p)
    setCategories(c)
    setLoading(false)
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = filterCategory === '' || p.category_id === filterCategory
    const matchesStock = filterStock === 'all' ? true
      : filterStock === 'out' ? p.stock === 0
      : filterStock === 'low' ? (p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5)
      : true
    return matchesSearch && matchesCategory && matchesStock
  })

  const outOfStock = products.filter(p => p.stock === 0).length
  const lowStock = products.filter(p => p.stock !== null && p.stock !== undefined && p.stock > 0 && p.stock <= 5).length

  const openCreate = () => {
    setForm({ name: '', description: '', price: '', category_id: '', cover_image: '', is_active: true, stock: '' })
    setCreating(true); setEditing(null)
  }

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, description: p.description || '', price: String(p.price),
      category_id: p.category_id || '', cover_image: p.cover_image || '',
      is_active: p.is_active, stock: p.stock !== null && p.stock !== undefined ? String(p.stock) : ''
    })
    setEditing(p); setCreating(false)
  }

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverCropFile(file)
    e.target.value = ''
  }

  const handleCoverCropConfirm = async (blob: Blob) => {
    setCoverCropFile(null)
    setUploadingCover(true)
    try {
      const croppedFile = new File([blob], 'copertina.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', croppedFile)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setForm(f => ({ ...f, cover_image: data.url }))
    } catch { console.error('Upload failed') }
    setUploadingCover(false)
  }

  const handleCoverCropCancel = () => setCoverCropFile(null)

  const handleSave = async () => {
    setSaving(true)
    const body = { ...form, price: parseFloat(form.price) || 0, category_id: form.category_id || null, stock: form.stock }
    if (editing) {
      await fetch('/api/admin/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: editing.id }) })
    } else {
      await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false); setEditing(null); setCreating(false); fetchAll()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo prodotto?')) return
    await fetch('/api/admin/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchAll()
  }

  const handleToggleActive = async (p: Product) => {
    await fetch('/api/admin/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, is_active: !p.is_active }) })
    fetchAll()
  }

  if (managingImagesFor) return <ProductImagesManager productId={managingImagesFor} onBack={() => setManagingImagesFor(null)} />
  if (loading) return <div className="text-center py-12 text-slate-400">Caricamento...</div>

  if (creating || editing) return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">{creating ? 'Nuovo prodotto' : 'Modifica prodotto'}</h2>
        <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setEditing(null) }}>Annulla</Button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Nome *</label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome prodotto" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Descrizione</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Descrizione prodotto" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Prezzo (€) *</label>
            <Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Categoria</label>
            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="">Nessuna</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> Quantità in magazzino
          </label>
          <Input
            type="number"
            min="0"
            value={form.stock}
            onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
            placeholder="Lascia vuoto = illimitato"
          />
          <p className="text-xs text-slate-400 mt-1">Lascia vuoto se non vuoi tracciare lo stock</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Immagine copertina</label>
          <Input value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} placeholder="URL immagine" className="mb-2" />
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-cyan-700 font-medium">
            <ImageIcon className="w-4 h-4" />
            {uploadingCover ? 'Caricamento...' : 'Carica file'}
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} disabled={uploadingCover} />
          </label>
          {form.cover_image && (
            <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
              <img src={form.cover_image} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-500">Attivo</label>
          <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
            {form.is_active ? <ToggleRight className="w-8 h-8 text-cyan-600" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
          </button>
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving || !form.name} className="w-full bg-cyan-600 hover:bg-cyan-700">
        {saving ? 'Salvataggio...' : 'Salva prodotto'}
      </Button>
      {coverCropFile && (
        <ImageCropper
          file={coverCropFile}
          onCancel={handleCoverCropCancel}
          onConfirm={handleCoverCropConfirm}
          minZoom={1}
        />
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Prodotti ({filteredProducts.length}/{products.length})</h2>
        <Button onClick={openCreate} size="sm" className="bg-cyan-600 hover:bg-cyan-700 gap-1">
          <Plus className="w-4 h-4" /> Nuovo
        </Button>
      </div>

      {/* Alert stock */}
      {(outOfStock > 0 || lowStock > 0) && (
        <div className="flex gap-2 flex-wrap">
          {outOfStock > 0 && (
            <button onClick={() => setFilterStock(filterStock === 'out' ? 'all' : 'out')}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${filterStock === 'out' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              <AlertTriangle className="w-3.5 h-3.5" /> {outOfStock} esauriti
            </button>
          )}
          {lowStock > 0 && (
            <button onClick={() => setFilterStock(filterStock === 'low' ? 'all' : 'low')}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${filterStock === 'low' ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-600 border border-sky-200'}`}>
              <AlertTriangle className="w-3.5 h-3.5" /> {lowStock} scorte basse
            </button>
          )}
        </div>
      )}

      {/* Search + filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca prodotto..." className="pl-9 pr-9" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-4 h-4" /></button>}
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white">
          <option value="">Tutte</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filteredProducts.map(p => (
          <div key={p.id} className={`flex items-center gap-3 bg-white border rounded-xl p-3 shadow-sm ${p.stock === 0 ? 'border-red-200 bg-red-50/30' : p.stock !== null && p.stock !== undefined && p.stock <= 5 ? 'border-sky-200 bg-sky-50/30' : 'border-slate-100'}`}>
            <div className="w-12 h-12 rounded-lg bg-slate-50 overflow-hidden shrink-0">
              {p.cover_image
                ? <img src={p.cover_image} alt={p.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-300" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-800 truncate">{p.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-cyan-700 font-semibold">€{p.price.toFixed(2)}</p>
                <span className="text-slate-300">·</span>
                <StockBadge stock={p.stock ?? null} />
              </div>
              {p.category && <p className="text-xs text-slate-400">{p.category.name}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => handleToggleActive(p)}>
                {p.is_active ? <ToggleRight className="w-6 h-6 text-cyan-600" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
              </button>
              <button onClick={() => setManagingImagesFor(p.id)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <Images className="w-4 h-4 text-slate-500" />
              </button>
              <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <Pencil className="w-4 h-4 text-slate-500" />
              </button>
              <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <p className="text-center py-8 text-slate-400 text-sm">
            {search || filterCategory || filterStock !== 'all' ? 'Nessun prodotto trovato' : 'Nessun prodotto. Creane uno!'}
          </p>
        )}
      </div>
    </div>
  )
}
CROPEOF

git add -A
git commit -m "fix: foto prodotto sempre a riempimento del riquadro, niente più bordi vuoti che si vedono ingranditi in pagina prodotto"
git push
