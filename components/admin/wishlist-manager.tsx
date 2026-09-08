"use client"

import { useState, useEffect } from 'react'
import { Heart, Trash2, Bell, Send, Check, ImageIcon } from 'lucide-react'

interface WishlistProduct { id: string; name: string; price: number; image: string | null }
interface WishlistEntry {
  id: string
  session_id: string
  updated_at: string
  has_push: boolean
  products: WishlistProduct[]
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'ora'
  if (min < 60) return `${min} min fa`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h fa`
  const d = Math.floor(h / 24)
  return `${d} g fa`
}

export function WishlistManager() {
  const [wishlists, setWishlists] = useState<WishlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  const [notifiedId, setNotifiedId] = useState<string | null>(null)
  const [notifyError, setNotifyError] = useState<{ id: string; message: string } | null>(null)

  const fetchWishlists = () => {
    fetch('/api/admin/wishlists')
      .then(r => r.json())
      .then(d => setWishlists(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchWishlists() }, [])

  const handleDelete = async (id: string) => {
    setWishlists(prev => prev.filter(w => w.id !== id))
    await fetch('/api/admin/wishlists', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
  }

  const handleNotify = async (id: string) => {
    setNotifyingId(id); setNotifyError(null)
    const res = await fetch('/api/admin/wishlists/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    const data = await res.json().catch(() => ({}))
    setNotifyingId(null)
    if (!res.ok) { setNotifyError({ id, message: data.error || 'Invio non riuscito' }); return }
    setNotifiedId(id)
    setTimeout(() => setNotifiedId(prev => prev === id ? null : prev), 3000)
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-500" /> Preferiti dei clienti ({wishlists.length})
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Prodotti che i clienti hanno salvato tra i preferiti sul loro dispositivo</p>
      </div>

      {wishlists.length === 0 && (
        <div className="text-center py-12">
          <Heart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-400 text-sm">Nessun preferito salvato al momento</p>
        </div>
      )}

      <div className="space-y-2">
        {wishlists.map(w => (
          <div key={w.id} className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-pink-100 text-pink-700">
                    {w.products.length} preferit{w.products.length === 1 ? 'o' : 'i'}
                  </span>
                  <span className="text-xs text-slate-400">{timeAgo(w.updated_at)}</span>
                  {w.has_push && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-cyan-100 text-cyan-700 flex items-center gap-1">
                      <Bell className="w-3 h-3" /> Notifiche attive
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {w.products.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-slate-50 rounded-lg pr-2.5 overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-9 h-9 object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 flex items-center justify-center bg-slate-200 shrink-0"><ImageIcon className="w-4 h-4 text-slate-400" /></div>
                      )}
                      <div className="min-w-0 py-1">
                        <p className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{p.name}</p>
                        <p className="text-[11px] text-slate-400">€{p.price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {w.has_push && (
                  <div className="mt-2.5">
                    <button onClick={() => handleNotify(w.id)} disabled={notifyingId === w.id}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-transform hover:scale-105 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
                      {notifiedId === w.id ? <><Check className="w-3.5 h-3.5" /> Inviato!</> : notifyingId === w.id ? 'Invio...' : <><Send className="w-3.5 h-3.5" /> Invia promemoria</>}
                    </button>
                    {notifyError && notifyError.id === w.id && <p className="text-xs text-red-500 mt-1">{notifyError.message}</p>}
                  </div>
                )}
              </div>
              <button onClick={() => handleDelete(w.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
