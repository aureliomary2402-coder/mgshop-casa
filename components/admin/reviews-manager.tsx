"use client"

import { useState, useEffect, useCallback } from 'react'
import { Star, Trash2, Send, Phone, MessageSquareReply } from 'lucide-react'
import type { Review } from '@/lib/types'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className="w-3.5 h-3.5" style={{ color: n <= rating ? '#f59e0b' : '#e2e8f0' }} fill={n <= rating ? '#f59e0b' : 'none'} />
      ))}
    </div>
  )
}

export function ReviewsManager() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reviews')
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      if (Array.isArray(data)) {
        setReviews(data)
        setReplyDrafts(prev => {
          const next = { ...prev }
          for (const r of data) if (next[r.id] === undefined) next[r.id] = r.admin_reply || ''
          return next
        })
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const saveReply = async (id: string) => {
    setSavingId(id)
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, admin_reply: replyDrafts[id] || '' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert('Errore salvataggio risposta: ' + (err.error || res.status))
      } else {
        fetchReviews()
      }
    } catch (e) {
      alert('Errore di rete: ' + e)
    }
    setSavingId(null)
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert('Errore eliminazione recensione: ' + (err.error || res.status))
        setDeleting(false)
        return
      }
      setConfirmDelete(null)
      fetchReviews()
    } catch (e) {
      alert('Errore di rete durante l\'eliminazione: ' + e)
    }
    setDeleting(false)
  }

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  const average = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-500" /> Recensioni ({reviews.length})
        {reviews.length > 0 && <span className="text-xs font-normal text-slate-400">media {average.toFixed(1)} / 5</span>}
      </h2>

      {reviews.length === 0 ? (
        <p className="text-center py-8 text-slate-400 text-sm">Nessuna recensione ricevuta</p>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{r.customer_name}</p>
                    <Stars rating={r.rating} />
                  </div>
                  {r.phone_number && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {r.phone_number}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(r.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {confirmDelete === r.id ? (
                  <div className="flex items-center gap-1.5 text-xs shrink-0">
                    <span className="text-slate-500">Eliminare?</span>
                    <button onClick={() => handleDelete(r.id)} disabled={deleting}
                      className="px-2.5 py-1.5 rounded-lg bg-red-500 text-white font-medium disabled:opacity-50">
                      {deleting ? '...' : 'Sì'}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-medium">
                      Annulla
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(r.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">{r.comment}</p>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <MessageSquareReply className="w-3.5 h-3.5" /> Risposta pubblica
                </p>
                <textarea
                  value={replyDrafts[r.id] ?? ''}
                  onChange={e => setReplyDrafts(prev => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="Scrivi una risposta visibile a tutti i clienti..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
                <button
                  onClick={() => saveReply(r.id)}
                  disabled={savingId === r.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
                  <Send className="w-3.5 h-3.5" /> {savingId === r.id ? 'Salvataggio...' : 'Salva risposta'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
