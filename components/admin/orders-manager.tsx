"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Package, Trash2, Pencil, Check, X, User, Plus, Minus, Search, ShoppingBag, Gift, Truck, Store, MapPin, MessageCircle, ImageIcon, ExternalLink } from 'lucide-react'
import type { Order, OrderItem, Product } from '@/lib/types'
import { SOURCE_LABELS } from '@/lib/cart-source'
import { optimizeImage } from '@/lib/image'

const STATUS_LABELS: Record<string, string> = {
  pending: 'In attesa', confirmed: 'Confermato', shipped: 'Spedito',
  delivered: 'Consegnato', cancelled: 'Annullato',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-teal-100 text-teal-700', confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface OrderWithItems extends Order { order_items: OrderItem[]; customer_name?: string; ticket_count?: number }

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
    const res = await fetch('/api/admin/orders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert('Errore eliminazione ordine: ' + (err.error || res.status))
      return
    }
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
      body: JSON.stringify({ order_id: orderId, product_id: product.id, product_name: product.name, product_price: product.price, quantity: 1, product_image: product.card_image || product.cover_image || null })
    })
    setSaving(false); setShowAddProduct(null); setProductSearch(''); fetchOrders()
  }

  const filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))

  // Link WhatsApp diretto verso il cliente, con un messaggio già pronto che
  // elenca i prodotti scelti: utile soprattutto per gli ordini con articoli
  // personalizzati, dove il prezzo finale va confermato via chat.
  const buildWhatsappLink = (order: OrderWithItems) => {
    const digits = order.phone_number.replace(/\D/g, '')
    const itemsText = order.order_items.map(i => {
      const custom = i.customization && i.customization.length > 0
        ? ` (${i.customization.map(c => `${c.label}: ${c.value}`).join(', ')})`
        : ''
      return `- ${i.product_name}${custom} x${i.quantity}`
    }).join('\n')
    const msg = `Ciao${order.customer_name ? ' ' + order.customer_name : ''}! Ti scrivo per il tuo ordine:\n${itemsText}\n\nTi confermo a breve i dettagli.`
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-slate-800">Ordini ({orders.length})</h2>
      {orders.length === 0 && (
        <div className="text-center py-12"><Package className="w-10 h-10 mx-auto text-slate-300 mb-2"/><p className="text-slate-400 text-sm">Nessun ordine ancora</p></div>
      )}
      <div className="space-y-2">
        {orders.map(order => (
          <div key={order.id} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            {/* Header ordine */}
            <div className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                  {editingName === order.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                        onKeyDown={e => { if(e.key==='Enter') saveName(order.id); if(e.key==='Escape') setEditingName(null) }}
                        placeholder="Nome cliente" autoFocus
                        className="text-sm font-medium border border-cyan-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-cyan-400" style={{color:'#0c2b36'}}/>
                      <button onClick={() => saveName(order.id)} className="p-1 hover:bg-green-50 rounded-lg"><Check className="w-4 h-4 text-green-500"/></button>
                      <button onClick={() => setEditingName(null)} className="p-1 hover:bg-red-50 rounded-lg"><X className="w-4 h-4 text-red-400"/></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 group/name">
                      <span className="font-medium text-sm text-slate-800">{order.customer_name || order.phone_number}</span>
                      {order.customer_name && <span className="text-xs text-slate-400">{order.phone_number}</span>}
                      <button onClick={e => { e.stopPropagation(); setEditingName(order.id); setNameInput(order.customer_name||'') }}
                        className="p-0.5 opacity-0 group-hover/name:opacity-100 hover:bg-slate-100 rounded transition-all">
                        <Pencil className="w-3 h-3 text-slate-400"/>
                      </button>
                    </div>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]||'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABELS[order.status]||order.status}
                  </span>
                  {!!order.ticket_count && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-cyan-100 text-cyan-700 flex items-center gap-1">
                      <Gift className="w-3 h-3"/> {order.ticket_count} bigliett{order.ticket_count > 1 ? 'i' : 'o'}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${order.delivery_method === 'consegna' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                    {order.delivery_method === 'consegna' ? <Truck className="w-3 h-3"/> : <Store className="w-3 h-3"/>}
                    {order.delivery_method === 'consegna' ? 'Consegna' : 'Ritiro'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(order.created_at).toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                  {' · '}€{order.total.toFixed(2)}
                </p>
                {order.delivery_method === 'consegna' && order.delivery_address && (
                  <p className="text-xs text-orange-600 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0"/> {order.delivery_address}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={buildWhatsappLink(order)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                  className="p-1.5 hover:bg-green-50 rounded-lg transition-colors" title="Scrivi su WhatsApp"><MessageCircle className="w-4 h-4 text-green-500"/></a>
                <button onClick={e => { e.stopPropagation(); setEditingName(order.id); setNameInput(order.customer_name||'') }}
                  className="p-1.5 hover:bg-cyan-50 rounded-lg transition-colors"><User className="w-4 h-4 text-cyan-500"/></button>
                <button onClick={() => { setEditingOrder(editingOrder===order.id?null:order.id); if(editingOrder!==order.id){fetchProducts();setExpanded(order.id)} }}
                  className={`p-1.5 rounded-lg transition-colors ${editingOrder===order.id?'bg-cyan-100':'hover:bg-cyan-50'}`}>
                  <Pencil className={`w-4 h-4 ${editingOrder===order.id?'text-cyan-700':'text-cyan-500'}`}/>
                </button>
                <button onClick={() => handleDelete(order.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-400"/></button>
                <button onClick={() => setExpanded(expanded===order.id?null:order.id)}>
                  {expanded===order.id?<ChevronUp className="w-4 h-4 text-slate-400"/>:<ChevronDown className="w-4 h-4 text-slate-400"/>}
                </button>
              </div>
            </div>

            {/* Dettaglio espanso */}
            {expanded === order.id && (
              <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">

                {/* Lista prodotti */}
                <div className="space-y-2">
                  {order.order_items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl" style={{background:'rgba(8,145,178,0.04)',border:'1px solid rgba(8,145,178,0.08)'}}>
                      {/* Foto prodotto: la stessa vista dal cliente al momento
                          dell'ordine, per riconoscerlo subito tra i tanti simili */}
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white border border-slate-100">
                        {item.product_image
                          ? <img src={optimizeImage(item.product_image, 96) || item.product_image} alt={item.product_name} width={48} height={48} className="absolute inset-0 w-full h-full object-cover object-center block" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-slate-300" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.product_name}</p>
                          {item.product_id && (
                            <Link href={`/prodotto/${item.product_id}`} target="_blank" rel="noopener noreferrer"
                              className="p-0.5 hover:bg-cyan-100 rounded transition-colors shrink-0" title="Apri la scheda prodotto">
                              <ExternalLink className="w-3 h-3 text-cyan-600" />
                            </Link>
                          )}
                        </div>
                        {item.customization && item.customization.length > 0 && (
                          <div className="flex flex-wrap gap-1 my-1">
                            {item.customization.map(c => (
                              <span key={c.option_id} className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{background:'rgba(217,70,239,0.08)',color:'#a21caf',border:'1px solid rgba(217,70,239,0.2)'}}>
                                {c.label}: {c.value}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <p className="text-xs text-cyan-700 font-semibold">€{item.product_price.toFixed(2)} cad.{item.is_customized && <span className="text-slate-400 font-normal"> · da confermare</span>}</p>
                          {item.source && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              da {SOURCE_LABELS[item.source]}
                            </span>
                          )}
                        </div>
                      </div>
                      {editingOrder === order.id ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => updateItemQty(item, -1)} disabled={saving}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors border border-slate-200">
                            <Minus className="w-3 h-3 text-slate-600"/>
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
                          <button onClick={() => updateItemQty(item, 1)} disabled={saving}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors border border-slate-200">
                            <Plus className="w-3 h-3 text-slate-600"/>
                          </button>
                          <button onClick={() => removeItem(item)} disabled={saving}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors ml-1">
                            <Trash2 className="w-4 h-4 text-red-400"/>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm text-slate-500">×{item.quantity}</span>
                          <span className="text-sm font-bold text-slate-800">€{(item.product_price*item.quantity).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Aggiungi prodotto */}
                  {editingOrder === order.id && (
                    <div>
                      {showAddProduct === order.id ? (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="p-2 border-b border-slate-100">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                              <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                placeholder="Cerca prodotto da aggiungere..."
                                autoFocus
                                className="w-full pl-9 pr-3 py-2 text-sm outline-none border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400"/>
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredProducts.slice(0,20).map(p => (
                              <button key={p.id} onClick={() => addProduct(order.id, p)} disabled={saving}
                                className="w-full flex items-center gap-3 p-3 hover:bg-cyan-50 transition-colors text-left border-b border-slate-50">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                                  <p className="text-xs text-cyan-700 font-bold">€{p.price.toFixed(2)}</p>
                                </div>
                                <Plus className="w-4 h-4 text-cyan-600 shrink-0"/>
                              </button>
                            ))}
                            {filteredProducts.length === 0 && <p className="text-center py-4 text-slate-400 text-sm">Nessun prodotto trovato</p>}
                          </div>
                          <button onClick={() => { setShowAddProduct(null); setProductSearch('') }}
                            className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors border-t border-slate-100">
                            Chiudi
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setShowAddProduct(order.id)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
                          style={{background:'rgba(8,145,178,0.08)',border:'1px dashed rgba(8,145,178,0.3)',color:'#0891b2'}}>
                          <Plus className="w-4 h-4"/> Aggiungi prodotto all'ordine
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Biglietti lotteria inclusi nell'ordine */}
                {!!order.ticket_count && (
                  <div className="flex items-center justify-between p-2 rounded-xl text-sm" style={{background:'rgba(8,145,178,0.06)',border:'1px solid rgba(8,145,178,0.15)'}}>
                    <span className="flex items-center gap-1.5 font-medium text-cyan-700">
                      <Gift className="w-4 h-4"/> {order.ticket_count} bigliett{order.ticket_count > 1 ? 'i' : 'o'} lotteria
                    </span>
                    <span className="font-bold text-cyan-700">€{order.ticket_count.toFixed(2)}</span>
                  </div>
                )}

                {/* Totale */}
                <div className="flex justify-between font-bold text-sm border-t border-slate-100 pt-2">
                  <span>Totale ordine</span>
                  <span className="text-cyan-700">€{order.total.toFixed(2)}</span>
                </div>
                {!!order.ticket_count && (
                  <p className="text-xs text-slate-400 -mt-1">di cui €{order.ticket_count.toFixed(2)} per i biglietti lotteria (già inclusi nel totale)</p>
                )}

                {/* Stato */}
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Aggiorna stato</label>
                  <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    {Object.entries(STATUS_LABELS).map(([value,label])=>(<option key={value} value={value}>{label}</option>))}
                  </select>
                </div>

                {editingOrder === order.id && (
                  <button onClick={() => setEditingOrder(null)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)'}}>
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
