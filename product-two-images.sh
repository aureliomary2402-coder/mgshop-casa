#!/bin/bash
set -e

# Esegui questo script dalla cartella del repo (cd ~/mgshop)

mkdir -p "lib"
cat > "lib/types.ts" << 'CARDIMGEOF'
export interface Category {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string | null
  cover_image: string | null
  card_image?: string | null
  is_active: boolean
  stock: number | null
  created_at: string
  updated_at: string
  category?: Category
}

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  display_order: number
  created_at: string
}

export interface Banner {
  id: string
  title: string | null
  subtitle: string | null
  image_url: string
  link: string | null
  is_active: boolean
  display_order: number
  created_at: string
}

export interface Order {
  id: string
  phone_number: string
  status: string
  total: number
  customer_name?: string
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_price: number
  quantity: number
  created_at: string
}

export interface CartItem {
  product: Product
  quantity: number
}
CARDIMGEOF

mkdir -p "components/admin"
cat > "components/admin/products-manager.tsx" << 'CARDIMGEOF'
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
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '', cover_image: '', card_image: '', is_active: true, stock: '' })
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverCropFile, setCoverCropFile] = useState<File | null>(null)
  const [uploadingCard, setUploadingCard] = useState(false)
  const [cardCropFile, setCardCropFile] = useState<File | null>(null)
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
    setForm({ name: '', description: '', price: '', category_id: '', cover_image: '', card_image: '', is_active: true, stock: '' })
    setCreating(true); setEditing(null)
  }

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, description: p.description || '', price: String(p.price),
      category_id: p.category_id || '', cover_image: p.cover_image || '', card_image: p.card_image || '',
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

  const handleCardSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCardCropFile(file)
    e.target.value = ''
  }

  const handleCardCropConfirm = async (blob: Blob) => {
    setCardCropFile(null)
    setUploadingCard(true)
    try {
      const croppedFile = new File([blob], 'card.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', croppedFile)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setForm(f => ({ ...f, card_image: data.url }))
    } catch { console.error('Upload failed') }
    setUploadingCard(false)
  }

  const handleCardCropCancel = () => setCardCropFile(null)

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
          <label className="text-xs font-medium text-slate-500 mb-1 block">Foto pagina prodotto</label>
          <p className="text-[11px] text-slate-400 mb-1.5">Quella grande che si vede aprendo il prodotto. Riempie sempre tutto il riquadro.</p>
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
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Foto per la card nel negozio</label>
          <p className="text-[11px] text-slate-400 mb-1.5">Quella piccola nell'elenco prodotti. Puoi rimpicciolirla per lasciare un po' di spazio attorno. Se non ne carichi una, viene usata quella della pagina prodotto.</p>
          <Input value={form.card_image} onChange={e => setForm(f => ({ ...f, card_image: e.target.value }))} placeholder="URL immagine (facoltativo)" className="mb-2" />
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-cyan-700 font-medium">
            <ImageIcon className="w-4 h-4" />
            {uploadingCard ? 'Caricamento...' : 'Carica file'}
            <input type="file" accept="image/*" className="hidden" onChange={handleCardSelect} disabled={uploadingCard} />
          </label>
          {form.card_image && (
            <div className="mt-2 relative w-24 h-24">
              <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                <img src={form.card_image} alt="preview" className="w-full h-full object-cover" />
              </div>
              <button onClick={() => setForm(f => ({ ...f, card_image: '' }))} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
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
      {cardCropFile && (
        <ImageCropper
          file={cardCropFile}
          onCancel={handleCardCropCancel}
          onConfirm={handleCardCropConfirm}
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
CARDIMGEOF

mkdir -p "app/api/admin/products"
cat > "app/api/admin/products/route.ts" << 'CARDIMGEOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: body.name,
      description: body.description,
      price: body.price,
      category_id: body.category_id || null,
      cover_image: body.cover_image,
      card_image: body.card_image || null,
      is_active: body.is_active ?? true,
      stock: body.stock !== '' && body.stock !== null && body.stock !== undefined ? parseInt(body.stock) : null,
    })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .update({
      name: body.name,
      description: body.description,
      price: body.price,
      category_id: body.category_id || null,
      cover_image: body.cover_image,
      card_image: body.card_image || null,
      is_active: body.is_active,
      stock: body.stock !== '' && body.stock !== null && body.stock !== undefined ? parseInt(body.stock) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
CARDIMGEOF

mkdir -p "components/shop"
cat > "components/shop/product-card.tsx" << 'CARDIMGEOF'
"use client"

import Link from 'next/link'
import { ImageIcon, ShoppingCart, Eye } from 'lucide-react'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { useCartStore } from '@/lib/cart-store'
import { useState, useRef } from 'react'
import { optimizeImage } from '@/lib/image'

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const addItem = useCartStore((state) => state.addItem)
  const [imgError, setImgError] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: y * 12, y: x * -12 })
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem(product)
    toast.success(`${product.name} aggiunto!`, {
      duration: 2000,
      style: { background: '#cffafe', border: '1px solid #0891b2', color: '#155e75' }
    })
  }

  const imgUrl = optimizeImage(product.card_image || product.cover_image, 400)

  return (
    <div
      ref={cardRef}
      className="group relative rounded-2xl overflow-hidden animate-fade-in-up"
      style={{
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        animationFillMode: 'both',
        background: 'white',
        border: '1px solid rgba(8,145,178,0.08)',
        boxShadow: isHovered
          ? '0 20px 40px rgba(8,145,178,0.15), 0 8px 16px rgba(0,0,0,0.06)'
          : '0 2px 8px rgba(0,0,0,0.04)',
        transform: isHovered
          ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px) scale(1.02)`
          : 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease',
        willChange: 'transform',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setTilt({ x: 0, y: 0 }) }}
    >
      <Link href={`/prodotto/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0fbfd, #cffafe)' }}>
          {imgUrl && !imgError ? (
            <img
              src={imgUrl}
              alt={product.name}
              loading={index < 8 ? 'eager' : 'lazy'}
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 ease-out"
              style={{ transform: isHovered ? 'scale(1.08)' : 'scale(1)' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10" style={{ color: 'rgba(8,145,178,0.3)' }} />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center transition-all duration-300"
            style={{ background: isHovered ? 'rgba(12,43,54,0.15)' : 'rgba(12,43,54,0)' }}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300"
              style={{
                background: 'rgba(240,251,253,0.95)',
                color: '#155e75',
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.9)',
              }}>
              <Eye className="w-3.5 h-3.5" /> Vedi dettagli
            </div>
          </div>
        </div>
      </Link>

      <div className="p-3">
        <Link href={`/prodotto/${product.id}`}>
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 leading-snug transition-colors"
            style={{ color: isHovered ? '#155e75' : '#0c2b36' }}>
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between">
          <span className="font-bold text-base" style={{ color: '#0891b2' }}>€{product.price.toFixed(2)}</span>
          <button
            onClick={handleAddToCart}
            className="flex items-center gap-1 text-white text-xs font-semibold px-3 py-1.5 rounded-full btn-press transition-all"
            style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 2px 8px rgba(8,145,178,0.3)' }}>
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Aggiungi</span>
          </button>
        </div>
      </div>
    </div>
  )
}
CARDIMGEOF

git add -A
git commit -m "feat: foto separata per la card negozio (zoom libero) e per la pagina prodotto (sempre a riempimento)"
git push
