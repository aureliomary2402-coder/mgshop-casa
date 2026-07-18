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
    <span className="text-xs text-stone-400">Illimitato</span>
  )
  if (stock === 0) return (
    <span className="text-xs font-semibold text-red-500 flex items-center gap-0.5">
      <AlertTriangle className="w-3 h-3" /> Esaurito
    </span>
  )
  if (stock <= 5) return (
    <span className="text-xs font-semibold text-orange-500 flex items-center gap-0.5">
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
  if (loading) return <div className="text-center py-12 text-stone-400">Caricamento...</div>

  if (creating || editing) return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-800">{creating ? 'Nuovo prodotto' : 'Modifica prodotto'}</h2>
        <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setEditing(null) }}>Annulla</Button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Nome *</label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome prodotto" />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Descrizione</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full border border-stone-200 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Descrizione prodotto" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Prezzo (€) *</label>
            <Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Categoria</label>
            <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">Nessuna</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> Quantità in magazzino
          </label>
          <Input
            type="number"
            min="0"
            value={form.stock}
            onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
            placeholder="Lascia vuoto = illimitato"
          />
          <p className="text-xs text-stone-400 mt-1">Lascia vuoto se non vuoi tracciare lo stock</p>
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Immagine copertina</label>
          <Input value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} placeholder="URL immagine" className="mb-2" />
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-amber-700 font-medium">
            <ImageIcon className="w-4 h-4" />
            {uploadingCover ? 'Caricamento...' : 'Carica file'}
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} disabled={uploadingCover} />
          </label>
          {form.cover_image && (
            <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden border border-stone-200">
              <img src={form.cover_image} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-stone-500">Attivo</label>
          <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
            {form.is_active ? <ToggleRight className="w-8 h-8 text-amber-600" /> : <ToggleLeft className="w-8 h-8 text-stone-400" />}
          </button>
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving || !form.name} className="w-full bg-amber-600 hover:bg-amber-700">
        {saving ? 'Salvataggio...' : 'Salva prodotto'}
      </Button>
      {coverCropFile && (
        <ImageCropper
          file={coverCropFile}
          onCancel={handleCoverCropCancel}
          onConfirm={handleCoverCropConfirm}
        />
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-800">Prodotti ({filteredProducts.length}/{products.length})</h2>
        <Button onClick={openCreate} size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1">
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
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${filterStock === 'low' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600 border border-orange-200'}`}>
              <AlertTriangle className="w-3.5 h-3.5" /> {lowStock} scorte basse
            </button>
          )}
        </div>
      )}

      {/* Search + filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca prodotto..." className="pl-9 pr-9" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"><X className="w-4 h-4" /></button>}
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
          <option value="">Tutte</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filteredProducts.map(p => (
          <div key={p.id} className={`flex items-center gap-3 bg-white border rounded-xl p-3 shadow-sm ${p.stock === 0 ? 'border-red-200 bg-red-50/30' : p.stock !== null && p.stock !== undefined && p.stock <= 5 ? 'border-orange-200 bg-orange-50/30' : 'border-stone-100'}`}>
            <div className="w-12 h-12 rounded-lg bg-stone-50 overflow-hidden shrink-0">
              {p.cover_image
                ? <img src={p.cover_image} alt={p.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-stone-300" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-stone-800 truncate">{p.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-amber-700 font-semibold">€{p.price.toFixed(2)}</p>
                <span className="text-stone-300">·</span>
                <StockBadge stock={p.stock ?? null} />
              </div>
              {p.category && <p className="text-xs text-stone-400">{p.category.name}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => handleToggleActive(p)}>
                {p.is_active ? <ToggleRight className="w-6 h-6 text-amber-600" /> : <ToggleLeft className="w-6 h-6 text-stone-300" />}
              </button>
              <button onClick={() => setManagingImagesFor(p.id)} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors">
                <Images className="w-4 h-4 text-stone-500" />
              </button>
              <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors">
                <Pencil className="w-4 h-4 text-stone-500" />
              </button>
              <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <p className="text-center py-8 text-stone-400 text-sm">
            {search || filterCategory || filterStock !== 'all' ? 'Nessun prodotto trovato' : 'Nessun prodotto. Creane uno!'}
          </p>
        )}
      </div>
    </div>
  )
}
