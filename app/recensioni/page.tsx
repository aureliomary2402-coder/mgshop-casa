"use client"
import { useState, useEffect } from 'react'
import { Star, MessageSquare, Send, CheckCircle2 } from 'lucide-react'
import { AmbientBubbles } from '@/components/shop/ambient-bubbles'
import { Reveal } from '@/components/shop/reveal'
import { PageHero } from '@/components/shop/page-hero'
import { StarRatingDisplay, StarRatingInput } from '@/components/shop/star-rating'
import type { Review } from '@/lib/types'

// Stessa chiave usata dal FloatingMenu per la chat: se il cliente ha già
// lasciato nome/numero lì, li ritroviamo qui pronti per essere riusati,
// senza chiedere di nuovo gli stessi dati.
const IDENTITY_KEY = 'mgshop_chat_identity'

export default function RecensioniPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [average, setAverage] = useState(0)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const fetchReviews = () => {
    fetch('/api/reviews')
      .then(r => r.json())
      .then(d => { setReviews(d.reviews || []); setAverage(d.average || 0); setCount(d.count || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchReviews()
    const raw = localStorage.getItem(IDENTITY_KEY)
    if (raw) {
      try {
        const identity = JSON.parse(raw)
        if (identity.name) setName(identity.name)
        if (identity.phone) setPhone(identity.phone)
      } catch {}
    }
  }, [])

  const handleSubmit = async () => {
    setError('')
    if (!name.trim()) { setError('Inserisci il tuo nome'); return }
    if (!rating) { setError('Seleziona una valutazione da 1 a 5 stelle'); return }
    if (!comment.trim()) { setError('Scrivi un breve commento'); return }
    setSending(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: name.trim(), phone_number: phone.trim() || null, rating, comment: comment.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error || 'Errore durante l\'invio, riprova')
        setSending(false)
        return
      }
      localStorage.setItem(IDENTITY_KEY, JSON.stringify({ name: name.trim(), phone: phone.trim() }))
      setSent(true)
      setComment('')
      setRating(0)
      fetchReviews()
    } catch {
      setError('Errore di connessione, riprova')
    }
    setSending(false)
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#eafbff 0%,#f5fdff 45%,#ffffff 100%)' }}>
      <PageHero
        icon={Star}
        iconColor="#f59e0b"
        badge={{ icon: MessageSquare, text: 'La tua opinione conta' }}
        title="Recensioni"
        subtitle={
          <span className="block max-w-xl mx-auto">
            {count > 0
              ? `${average.toFixed(1)} su 5 — ${count} recensione${count === 1 ? '' : 'i'} dei nostri clienti`
              : 'Sii il primo a lasciare una recensione'}
          </span>
        }
      >
        {count > 0 && (
          <div className="flex justify-center">
            <StarRatingDisplay rating={average} size={22} />
          </div>
        )}
      </PageHero>

      <div className="relative overflow-hidden">
        <AmbientBubbles count={16} theme="light" />
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-10 space-y-8">

          {/* Form nuova recensione */}
          <Reveal>
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: '#0c2b36' }}>Lascia la tua recensione</h2>
              {sent ? (
                <div className="flex flex-col items-center text-center gap-2 py-6">
                  <CheckCircle2 className="w-10 h-10" style={{ color: '#16a34a' }} />
                  <p className="font-semibold" style={{ color: '#0c2b36' }}>Grazie per la tua recensione!</p>
                  <p className="text-sm text-slate-500">È già visibile qui sotto insieme alle altre.</p>
                  <button onClick={() => setSent(false)} className="text-sm font-semibold mt-2" style={{ color: '#0891b2' }}>
                    Lascia un'altra recensione
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-2 py-2">
                    <StarRatingInput value={rating} onChange={setRating} />
                  </div>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Il tuo nome"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Racconta la tua esperienza con MGShop Casa..."
                    rows={4}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  />
                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                  <button
                    onClick={handleSubmit}
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 btn-press"
                    style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}
                  >
                    <Send className="w-4 h-4" /> {sending ? 'Invio in corso...' : 'Invia recensione'}
                  </button>
                </div>
              )}
            </div>
          </Reveal>

          {/* Elenco recensioni */}
          <div className="space-y-4">
            {loading ? (
              <p className="text-center py-8 text-slate-400 text-sm">Caricamento...</p>
            ) : reviews.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">Nessuna recensione ancora, sii il primo a scriverne una!</p>
            ) : reviews.map((r, i) => (
              <Reveal key={r.id} delay={i * 50}>
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-bold" style={{ color: '#0c2b36' }}>{r.customer_name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(r.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <StarRatingDisplay rating={r.rating} />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{r.comment}</p>

                  {r.admin_reply && (
                    <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.15)' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: '#0891b2' }}>Risposta di MGShop Casa</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{r.admin_reply}</p>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
