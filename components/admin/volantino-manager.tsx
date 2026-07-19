"use client"

import { useState, useEffect } from 'react'
import { ToggleLeft, ToggleRight, Save, Eye, Plus, X, Search, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Product } from '@/lib/types'

interface VolantinoItem {
  product_id: string
  sale_price: number
}

export function VolantinoManager() {
  const [isActive, setIsActive] = useState(false)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [items, setItems] = useState<VolantinoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductPicker, setShowProductPicker] = useState(false)

  useEffect(() => {
    fetch('/api/admin/volantino')
      .then(r => r.json())
      .then(d => {
        setIsActive(d.is_active === true)
        setTitle(d.title || '')
        setSubtitle(d.subtitle || '')
        setItems(d.items || [])
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
    const res = await fetch('/api/admin/volantino', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive, title, subtitle, items })
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    else setError('Errore salvataggio')
    setSaving(false)
  }

  const addProduct = (product: Product) => {
    if (items.some(i => i.product_id === product.id)) return
    setItems(prev => [...prev, { product_id: product.id, sale_price: product.price }])
  }

  const removeProduct = (productId: string) => {
    setItems(prev => prev.filter(i => i.product_id !== productId))
  }

  const updateSalePrice = (productId: string, price: string) => {
    const val = parseFloat(price)
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, sale_price: isNaN(val) ? 0 : val } : i))
  }

  const filteredProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const itemProducts = items
    .map(i => ({ item: i, product: allProducts.find(p => p.id === i.product_id) }))
    .filter((x): x is { item: VolantinoItem; product: Product } => !!x.product)

  if (loading) return <div className="text-center py-8 text-stone-400">Caricamento...</div>

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex items-center justify-between p-4 rounded-2xl border"
        style={{ background: isActive ? 'rgba(217,119,6,0.06)' : 'rgba(0,0,0,0.02)', borderColor: isActive ? 'rgba(217,119,6,0.2)' : 'rgba(0,0,0,0.08)' }}>
        <div>
          <p className="font-semibold text-stone-800">Volantino</p>
          <p className="text-xs mt-0.5">
            {isActive ? <span className="text-amber-600 font-medium">Attivo — ricordati di salvare!</span> : <span className="text-stone-400">Disattivato — ricordati di salvare!</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <Link href="/volantino" target="_blank" className="flex items-center gap-1.5 text-xs text-amber-700 font-medium px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50">
              <Eye className="w-3.5 h-3.5" /> Vedi
            </Link>
          )}
          <button onClick={() => setIsActive(v => !v)} className="focus:outline-none hover:scale-110 transition-transform">
            {isActive ? <ToggleRight className="w-10 h-10 text-amber-600" /> : <ToggleLeft className="w-10 h-10 text-stone-300" />}
          </button>
        </div>
      </div>

      <div className="p-3 rounded-xl text-xs text-amber-700 font-medium" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.15)' }}>
        Dopo ogni modifica clicca Salva modifiche
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Titolo</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. Volantino Offerte" />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Sottotitolo</label>
          <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Es. Offerte valide fino ad esaurimento scorte" />
        </div>

        {/* Prodotti nel volantino */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-stone-500">Prodotti nel volantino ({items.length})</label>
            <button onClick={() => setShowProductPicker(v => !v)}
              className="flex items-center gap-1 text-xs text-amber-700 font-medium px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Aggiungi prodotti
            </button>
          </div>

          {/* Prodotti selezionati con prezzo scontato editabile */}
          {itemProducts.length > 0 && (
            <div className="space-y-2 mb-3">
              {itemProducts.map(({ item, product }) => (
                <div key={product.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-amber-100 bg-amber-50">
                  {product.cover_image && <img src={product.cover_image} alt={product.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{product.name}</p>
                    <p className="text-xs text-stone-400 line-through">euro{product.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Tag className="w-3.5 h-3.5 text-red-500" />
                    <Input
                      type="number" step="0.01" value={item.sale_price}
                      onChange={e => updateSalePrice(product.id, e.target.value)}
                      className="w-20 h-9 text-sm font-bold text-red-600"
                    />
                  </div>
                  <button onClick={() => removeProduct(product.id)} className="p-1 hover:bg-red-100 rounded-lg transition-colors shrink-0">
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Product picker */}
          {showProductPicker && (
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="p-2 border-b border-stone-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="Cerca prodotto..." className="pl-9 h-9 text-sm" />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredProducts.map(p => {
                  const already = items.some(i => i.product_id === p.id)
                  return (
                    <button key={p.id} onClick={() => addProduct(p)} disabled={already}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-stone-50 transition-colors text-left border-b border-stone-50 ${already ? 'opacity-40' : ''}`}>
                      {p.cover_image
                        ? <img src={p.cover_image} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        : <div className="w-10 h-10 rounded-lg bg-stone-100 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{p.name}</p>
                        <p className="text-xs text-amber-700">euro{p.price.toFixed(2)}</p>
                      </div>
                      {already && <span className="text-xs text-stone-400 font-bold shrink-0">Aggiunto</span>}
                    </button>
                  )
                })}
              </div>
              <div className="p-2 border-t border-stone-100">
                <button onClick={() => setShowProductPicker(false)} className="w-full text-sm text-stone-500 py-1">Chiudi</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-base py-6">
        <Save className="w-5 h-5" />
        {saved ? 'Salvato!' : saving ? 'Salvataggio...' : 'Salva modifiche'}
      </Button>
    </div>
  )
}
