"use client"

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Images, ToggleLeft, ToggleRight, ImageIcon, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductImagesManager } from './product-images-manager'
import type { Product, Category } from '@/lib/types'

export function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [managingImagesFor, setManagingImagesFor] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '', cover_image: '', is_active: true })
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

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
    return matchesSearch && matchesCategory
  })

  const openCreate = () => {
    setForm({ name: '', description: '', price: '', category_id: '', cover_image: '', is_active: true })
    setCreating(true)
    setEditing(null)
  }

  const openEdit = (p: Product) => {
    setForm({ name: p.name, description: p.description || '', price: String(p.price), category_id: p.category_id || '', cover_image: p.cover_image || '', is_active: p.is_active })
    setEditing(p)
    setCreating(false)
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setForm(f => ({ ...f, cover_image: data.url }))
    } catch { console.error('Upload failed') }
    setUploadingCover(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const body = { ...form, price: parseFloat(form.price) || 0, category_id: form.category_id || null }
    if (editing) {
      await fetch('/api/admin/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, id: editing.id }) })
    } else {
      await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false)
    setEditing(null)
    setCreating(false)
    fetchAll()
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

  if (managingImagesFor) return (
    <ProductImagesManager productId={managingImagesFor} onBack={() => setManagingImagesFor(null)} />
  )

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
          <label className="text-xs font-medium text-stone-500 mb-1 block">Immagine copertina</label>
          <Input value={form.cover_image} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} placeholder="URL immagine o carica file" className="mb-2" />
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-amber-700 font-medium">
            <ImageIcon className="w-4 h-4" />
            {uploadingCover ? 'Caricamento...' : 'Carica file'}
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
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

      {/* Barra ricerca + filtro categoria */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca prodotto..."
            className="pl-9 pr-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
        >
          <option value="">Tutte</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filteredProducts.map(p => (
          <div key={p.id} className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl p-3 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-stone-50 overflow-hidden shrink-0">
              {p.cover_image
                ? <img src={p.cover_image} alt={p.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-stone-300" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-stone-800 truncate">{p.name}</p>
              <p className="text-xs text-amber-700 font-semibold">€{p.price.toFixed(2)}</p>
              {p.category && <p className="text-xs text-stone-400">{p.category.name}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => handleToggleActive(p)} title={p.is_active ? 'Disattiva' : 'Attiva'}>
                {p.is_active ? <ToggleRight className="w-6 h-6 text-amber-600" /> : <ToggleLeft className="w-6 h-6 text-stone-300" />}
              </button>
              <button onClick={() => setManagingImagesFor(p.id)} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors" title="Galleria">
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
            {search || filterCategory ? 'Nessun prodotto trovato con questi filtri' : 'Nessun prodotto. Creane uno!'}
          </p>
        )}
      </div>
    </div>
  )
}
