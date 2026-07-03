"use client"

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Package, Trash2, Pencil, Check, X, User, Plus, Minus, Search, ShoppingBag } from 'lucide-react'
import type { Order, OrderItem, Product } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  pending: 'In attesa', confirmed: 'Confermato', shipped: 'Spedito',
  delivered: 'Consegnato', cancelled: 'Annullato',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface OrderWithItems extends Order { order_items: OrderItem[]; customer_name?: string }

export function OrdersManager() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [editingOrder, setEditingOrder] = useState<string | null>(null)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showAddProduct, setShowAddProduct] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    const res = await fetch('/api/admin/orders')
    setOrders(await res.json())
    setLoading(false)
  }

  const fetchProducts = async () => {
    if (allProducts.length > 0) return
    const res = await fetch('/api/admin/products')
    setAllProducts(await res.json())
  }

  const handleStatusChange = async (id: string, status: string) => {
    await fetch('/api/admin/orders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    fetchOrders()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo ordine?')) return
    await fetch('/api/admin/orders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (expanded === id) setExpanded(null)
    fetchOrders()
  }

  const saveName = async (id: string) => {
    await fetch('/api/admin/orders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, customer_name: nameInput.trim() }) })
    setEditingName(null); fetchOrders()
  }

  const updateItemQty = async (item: OrderItem, delta: number) => {
    setSaving(true)
    const newQty = item.quantity + delta
    await fetch('/api/admin/order-items', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, quantity: newQty, order_id: item.order_id })
    })
    setSaving(false); fetchOrders()
  }

  const removeItem = async (item: OrderItem) => {
    if (!confirm('Rimuovere questo prodotto dall\'ordine?')) return
    setSaving(true)
    await fetch('/api/admin/order-items', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, order_id: item.order_id })
    })
    setSaving(false); fetchOrders()
  }

  const addProduct = async (orderId: string, product: Product) => {
    setSaving(true)
    await fetch('/api/admin/order-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, product_id: product.id, product_name: product.name, product_price: product.price, quantity: 1 })
    })
    setSaving(false); setShowAddProduct(null); setProductSearch(''); fetchOrders()
  }

  const filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))

  if (loading) return <div className="text-center py-8 text-stone-400">Caricamento...</div>

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-stone-800">Ordini ({orders.length})</h2>
      {orders.length === 0 && (
        <div className="text-center py-12"><Package className="w-10 h-10 mx-auto text-stone-300 mb-2"/><p className="text-stone-400 text-sm">Nessun ordine ancora</p></div>
      )}
      <div className="space-y-2">
        {orders.map(order => (
          <div key={order.id} className="bg-white border border-stone-100 rounded-xl shadow-sm overflow-hidden">
            {/* Header ordine */}
            <div className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                  {editingName === order.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                        onKeyDown={e => { if(e.key==='Enter') saveName(order.id); if(e.key==='Escape') setEditingName(null) }}
                        placeholder="Nome cliente" autoFocus
                        className="text-sm font-medium border border-amber-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-amber-400" style={{color:'#1a0800'}}/>
                      <button onClick={() => saveName(order.id)} className="p-1 hover:bg-green-50 rounded-lg"><Check className="w-4 h-4 text-green-500"/></button>
                      <button onClick={() => setEditingName(null)} className="p-1 hover:bg-red-50 rounded-lg"><X className="w-4 h-4 text-red-400"/></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 group/name">
                      <span className="font-medium text-sm text-stone-800">{order.customer_name || order.phone_number}</span>
                      {order.customer_name && <span className="text-xs text-stone-400">{order.phone_number}</span>}
                      <button onClick={e => { e.stopPropagation(); setEditingName(order.id); setNameInput(order.customer_name||'') }}
                        className="p-0.5 opacity-0 group-hover/name:opacity-100 hover:bg-stone-100 rounded transition-all">
                        <Pencil className="w-3 h-3 text-stone-400"/>
                      </button>
                    </div>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]||'bg-stone-100 text-stone-600'}`}>
                    {STATUS_LABELS[order.status]||order.status}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  {new Date(order.created_at).toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                  {' · '}€{order.total.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={e => { e.stopPropagation(); setEditingName(order.id); setNameInput(order.customer_name||'') }}
                  className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"><User className="w-4 h-4 text-amber-500"/></button>
                <button onClick={() => { setEditingOrder(editingOrder===order.id?null:order.id); if(editingOrder!==order.id){fetchProducts();setExpanded(order.id)} }}
                  className={`p-1.5 rounded-lg transition-colors ${editingOrder===order.id?'bg-amber-100':'hover:bg-amber-50'}`}>
                  <Pencil className={`w-4 h-4 ${editingOrder===order.id?'text-amber-700':'text-amber-500'}`}/>
                </button>
                <button onClick={() => handleDelete(order.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-400"/></button>
                <button onClick={() => setExpanded(expanded===order.id?null:order.id)}>
                  {expanded===order.id?<ChevronUp className="w-4 h-4 text-stone-400"/>:<ChevronDown className="w-4 h-4 text-stone-400"/>}
                </button>
              </div>
            </div>

            {/* Dettaglio espanso */}
            {expanded === order.id && (
              <div className="border-t border-stone-100 px-4 pb-4 pt-3 space-y-3">

                {/* Lista prodotti */}
                <div className="space-y-2">
                  {order.order_items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl" style={{background:'rgba(217,119,6,0.04)',border:'1px solid rgba(217,119,6,0.08)'}}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{item.product_name}</p>
                        <p className="text-xs text-amber-700 font-semibold">€{item.product_price.toFixed(2)} cad.</p>
                      </div>
                      {editingOrder === order.id ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => updateItemQty(item, -1)} disabled={saving}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-stone-200 transition-colors border border-stone-200">
                            <Minus className="w-3 h-3 text-stone-600"/>
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-stone-800">{item.quantity}</span>
                          <button onClick={() => updateItemQty(item, 1)} disabled={saving}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-stone-200 transition-colors border border-stone-200">
                            <Plus className="w-3 h-3 text-stone-600"/>
                          </button>
                          <button onClick={() => removeItem(item)} disabled={saving}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors ml-1">
                            <Trash2 className="w-4 h-4 text-red-400"/>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm text-stone-500">×{item.quantity}</span>
                          <span className="text-sm font-bold text-stone-800">€{(item.product_price*item.quantity).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Aggiungi prodotto */}
                  {editingOrder === order.id && (
                    <div>
                      {showAddProduct === order.id ? (
                        <div className="border border-stone-200 rounded-xl overflow-hidden">
                          <div className="p-2 border-b border-stone-100">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"/>
                              <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                placeholder="Cerca prodotto da aggiungere..."
                                autoFocus
                                className="w-full pl-9 pr-3 py-2 text-sm outline-none border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-400"/>
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredProducts.slice(0,20).map(p => (
                              <button key={p.id} onClick={() => addProduct(order.id, p)} disabled={saving}
                                className="w-full flex items-center gap-3 p-3 hover:bg-amber-50 transition-colors text-left border-b border-stone-50">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-stone-800 truncate">{p.name}</p>
                                  <p className="text-xs text-amber-700 font-bold">€{p.price.toFixed(2)}</p>
                                </div>
                                <Plus className="w-4 h-4 text-amber-600 shrink-0"/>
                              </button>
                            ))}
                            {filteredProducts.length === 0 && <p className="text-center py-4 text-stone-400 text-sm">Nessun prodotto trovato</p>}
                          </div>
                          <button onClick={() => { setShowAddProduct(null); setProductSearch('') }}
                            className="w-full py-2 text-sm text-stone-400 hover:text-stone-600 transition-colors border-t border-stone-100">
                            Chiudi
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setShowAddProduct(order.id)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
                          style={{background:'rgba(217,119,6,0.08)',border:'1px dashed rgba(217,119,6,0.3)',color:'#d97706'}}>
                          <Plus className="w-4 h-4"/> Aggiungi prodotto all'ordine
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Totale */}
                <div className="flex justify-between font-bold text-sm border-t border-stone-100 pt-2">
                  <span>Totale ordine</span>
                  <span className="text-amber-700">€{order.total.toFixed(2)}</span>
                </div>

                {/* Stato */}
                <div>
                  <label className="text-xs font-medium text-stone-500 mb-1 block">Aggiorna stato</label>
                  <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    {Object.entries(STATUS_LABELS).map(([value,label])=>(<option key={value} value={value}>{label}</option>))}
                  </select>
                </div>

                {editingOrder === order.id && (
                  <button onClick={() => setEditingOrder(null)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{background:'linear-gradient(135deg,#d97706,#f59e0b)'}}>
                    ✓ Fine modifica
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
