"use client"

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Images, ToggleLeft, ToggleRight, ImageIcon, Search, X, Package, AlertTriangle, Clock, Palette, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductImagesManager } from './product-images-manager'
import { ImageCropper } from './image-cropper'
import type { Product, Category, CustomizationOption } from '@/lib/types'
import { createCustomizationOptionId } from '@/lib/customization'

function emptyOption(): CustomizationOption {
  return { id: createCustomizationOptionId(), label: '', type: 'select', required: true, choices: [] }
}

// Editor delle opzioni di personalizzazione (colore, dimensione, testo libero...)
// mostrato nel form prodotto quando è attiva la modalità "Personalizzabile".
function CustomizationOptionsEditor({ options, onChange }: { options: CustomizationOption[]; onChange: (opts: CustomizationOption[]) => void }) {
  const updateOption = (id: string, patch: Partial<CustomizationOption>) => {
    onChange(options.map(o => o.id === id ? { ...o, ...patch } : o))
  }
  const removeOption = (id: string) => onChange(options.filter(o => o.id !== id))
  const addOption = () => onChange([...options, emptyOption()])

  return (
    <div className="space-y-3">
      {options.map((opt, idx) => (
        <div key={opt.id} className="rounded-xl border border-cyan-100 bg-cyan-50/30 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
            <Input
              value={opt.label}
              onChange={e => updateOption(opt.id, { label: e.target.value })}
              placeholder={`Nome opzione ${idx + 1} (es. Colore, Dimensione, Scritta...)`}
              className="flex-1"
            />
            <button onClick={() => removeOption(opt.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0">
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
          <div className="flex items-center gap-4 pl-6">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input type="radio" checked={opt.type === 'select'} onChange={() => updateOption(opt.id, { type: 'select' })} />
              Scelta tra opzioni
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input type="radio" checked={opt.type === 'text'} onChange={() => updateOption(opt.id, { type: 'text' })} />
              Testo libero
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer ml-auto">
              <input type="checkbox" checked={opt.required} onChange={e => updateOption(opt.id, { required: e.target.checked })} />
              Obbligatoria
            </label>
          </div>
          {opt.type === 'select' ? (
            <div className="pl-6">
              <Input
                value={(opt.choices || []).join(', ')}
                onChange={e => updateOption(opt.id, { choices: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
                placeholder="Valori separati da virgola (es. Rosso, Blu, Nero)"
              />
              <p className="text-[11px] text-slate-400 mt-1">Il cliente vedrà questi valori come pulsanti tra cui scegliere</p>
            </div>
          ) : (
            <div className="pl-6">
              <Input
                value={opt.placeholder || ''}
                onChange={e => updateOption(opt.id, { placeholder: e.target.value })}
                placeholder="Testo di esempio nel campo (facoltativo, es. Scrivi qui la scritta da ricamare)"
              />
            </div>
          )}
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={addOption} className="gap-1">
        <Plus className="w-4 h-4" /> Aggiungi opzione
      </Button>
      {options.length === 0 && (
        <p className="text-xs text-slate-400">Nessuna opzione ancora. Aggiungine una (es. Colore, Dimensione) perché il cliente possa personalizzare il prodotto prima di aggiungerlo al carrello.</p>
      )}
    </div>
  )
}

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
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '', cover_image: '', card_image: '', is_active: true, stock: '', torna_presto: false, is_customizable: false, customization_options: [] as CustomizationOption[] })
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
    setForm({ name: '', description: '', price: '', category_id: '', cover_image: '', card_image: '', is_active: true, stock: '', torna_presto: false, is_customizable: false, customization_options: [] })
    setCreating(true); setEditing(null)
  }

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, description: p.description || '', price: String(p.price),
      category_id: p.category_id || '', cover_image: p.cover_image || '', card_image: p.card_image || '',
      is_active: p.is_active, stock: p.stock !== null && p.stock !== undefined ? String(p.stock) : '',
      torna_presto: p.torna_presto ?? false,
      is_customizable: p.is_customizable ?? false,
      customization_options: p.customization_options ?? [],
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
    const res = await fetch('/api/admin/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert('Errore eliminazione prodotto: ' + (err.error || res.status))
      return
    }
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
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
            <Palette className="w-3.5 h-3.5" /> Tipo di scheda prodotto
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setForm(f => ({ ...f, is_customizable: false }))}
              className={`text-sm font-medium py-2.5 rounded-xl border transition-all ${!form.is_customizable ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-500 border-slate-200'}`}>
              Classica
            </button>
            <button type="button" onClick={() => setForm(f => ({ ...f, is_customizable: true }))}
              className={`text-sm font-medium py-2.5 rounded-xl border transition-all ${form.is_customizable ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-500 border-slate-200'}`}>
              Personalizzabile
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            {form.is_customizable
              ? 'Il cliente sceglie colore, dimensione o altro prima di aggiungere al carrello. Il prezzo qui sopra resta indicativo: comunicalo poi via WhatsApp in base alla scelta.'
              : 'Il cliente aggiunge il prodotto al carrello con un click, come al solito.'}
          </p>
        </div>

        {form.is_customizable && (
          <div className="rounded-xl border border-cyan-200 p-3 space-y-2 bg-white">
            <label className="text-xs font-semibold text-slate-700">Opzioni di personalizzazione</label>
            <CustomizationOptionsEditor
              options={form.customization_options}
              onChange={opts => setForm(f => ({ ...f, customization_options: opts }))}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-500">Attivo</label>
          <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
            {form.is_active ? <ToggleRight className="w-8 h-8 text-cyan-600" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
          </button>
        </div>
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${form.torna_presto ? 'bg-red-50 border-red-200' : 'border-slate-100'}`}>
          <button onClick={() => setForm(f => ({ ...f, torna_presto: !f.torna_presto }))} className="shrink-0">
            {form.torna_presto ? <ToggleRight className="w-8 h-8 text-red-500" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
          </button>
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Torna presto
            </label>
            <p className="text-[11px] text-slate-400">Prodotto momentaneamente assente: non acquistabile, immagine in bianco e nero con timbro</p>
          </div>
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
          <div key={p.id} className={`flex items-center gap-3 bg-white border rounded-xl p-3 shadow-sm ${p.torna_presto ? 'border-red-300 bg-red-50/40' : p.stock === 0 ? 'border-red-200 bg-red-50/30' : p.stock !== null && p.stock !== undefined && p.stock <= 5 ? 'border-sky-200 bg-sky-50/30' : 'border-slate-100'}`}>
            <div className="w-12 h-12 rounded-lg bg-slate-50 overflow-hidden shrink-0">
              {p.cover_image
                ? <img src={p.cover_image} alt={p.name} className="w-full h-full object-cover" style={p.torna_presto ? { filter: 'grayscale(1)' } : undefined} />
                : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-300" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-800 truncate">{p.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-cyan-700 font-semibold">€{p.price.toFixed(2)}</p>
                {p.is_customizable && (
                  <span className="text-xs font-semibold text-fuchsia-600 flex items-center gap-0.5">
                    <Palette className="w-3 h-3" /> Personalizzabile
                  </span>
                )}
                <span className="text-slate-300">·</span>
                {p.torna_presto
                  ? <span className="text-xs font-semibold text-red-500 flex items-center gap-0.5"><Clock className="w-3 h-3" /> Torna presto</span>
                  : <StockBadge stock={p.stock ?? null} />}
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
