"use client"
import { useState, useEffect } from 'react'
import { Star, MessageSquare, Send, CheckCircle2, Camera, X, PlayCircle, Loader2 } from 'lucide-react'
import { AmbientBubbles } from '@/components/shop/ambient-bubbles'
import { Reveal } from '@/components/shop/reveal'
import { PageHero } from '@/components/shop/page-hero'
import { StarRatingDisplay, StarRatingInput } from '@/components/shop/star-rating'
import type { Review, ReviewMedia } from '@/lib/types'

type Attachment = {
  localId: string
  previewUrl: string
  type: 'image' | 'video'
  uploading: boolean
  error?: string
  uploadedUrl?: string
}

// Il metodo "fetch" della libreria Supabase per l'upload diretto ha un bug
// noto su Safari/iOS (corpo della richiesta vuoto o troncato): usiamo
// XMLHttpRequest, più affidabile per l'invio di file binari, per caricare
// i video pesanti direttamente su Supabase Storage.
function uploadFileViaXHR(signedUrl: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Impossibile leggere il file dal telefono'))
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer
      if (!buffer || buffer.byteLength === 0) {
        reject(new Error('Il file letto risulta vuoto (0 byte)'))
        return
      }
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', signedUrl, true)
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      xhr.setRequestHeader('apikey', anonKey)
      xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`)
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else reject(new Error(`Caricamento fallito (${xhr.status})`))
      }
      xhr.onerror = () => reject(new Error('Errore di rete durante il caricamento'))
      xhr.send(buffer)
    }
    reader.readAsArrayBuffer(file)
  })
}

const MAX_ATTACHMENTS = 6

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
  const [attachments, setAttachments] = useState<Attachment[]>([])

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

  // Carica un file (foto o video) allegato alla recensione: le foto passano
  // dal server (/api/upload), i video invece vanno caricati direttamente su
  // Supabase Storage con un URL firmato, perché possono superare il limite
  // di ~4.5MB accettato dalle funzioni serverless di Vercel.
  const uploadAttachment = async (localId: string, file: File) => {
    const isVideo = file.type.startsWith('video/')
    try {
      let url: string
      if (isVideo) {
        const signRes = await fetch('/api/reviews/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name }),
        })
        const signData = await signRes.json()
        if (!signRes.ok) throw new Error(signData.error || 'Errore preparazione upload')
        await uploadFileViaXHR(signData.signedUrl, file)
        url = signData.publicUrl
      } else {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok || !data.url) throw new Error(data.error || 'Errore durante il caricamento')
        url = data.url
      }
      setAttachments(prev => prev.map(a => a.localId === localId ? { ...a, uploading: false, uploadedUrl: url } : a))
    } catch (e: any) {
      setAttachments(prev => prev.map(a => a.localId === localId ? { ...a, uploading: false, error: e?.message || 'Errore di caricamento' } : a))
    }
  }

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const remaining = MAX_ATTACHMENTS - attachments.length
    const toAdd = Array.from(files).slice(0, Math.max(0, remaining))
    for (const file of toAdd) {
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const isVideo = file.type.startsWith('video/')
      setAttachments(prev => [...prev, {
        localId,
        previewUrl: URL.createObjectURL(file),
        type: isVideo ? 'video' : 'image',
        uploading: true,
      }])
      uploadAttachment(localId, file)
    }
    e.target.value = ''
  }

  const handleRemoveAttachment = (localId: string) => {
    setAttachments(prev => {
      const found = prev.find(a => a.localId === localId)
      if (found) URL.revokeObjectURL(found.previewUrl)
      return prev.filter(a => a.localId !== localId)
    })
  }

  const handleSubmit = async () => {
    setError('')
    if (!name.trim()) { setError('Inserisci il tuo nome'); return }
    if (!rating) { setError('Seleziona una valutazione da 1 a 5 stelle'); return }
    if (!comment.trim()) { setError('Scrivi un breve commento'); return }
    if (attachments.some(a => a.uploading)) { setError('Attendi il completamento del caricamento di foto/video'); return }
    setSending(true)
    try {
      const media = attachments
        .filter(a => a.uploadedUrl)
        .map(a => ({ media_url: a.uploadedUrl, media_type: a.type }))
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: name.trim(), phone_number: phone.trim() || null, rating, comment: comment.trim(), media }),
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
      attachments.forEach(a => URL.revokeObjectURL(a.previewUrl))
      setAttachments([])
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
                  <div className="space-y-2">
                    {attachments.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {attachments.map(a => (
                          <div key={a.localId} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                            {a.type === 'video' ? (
                              <video src={a.previewUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                            ) : (
                              <img src={a.previewUrl} alt="" className="w-full h-full object-cover" />
                            )}
                            {a.type === 'video' && !a.uploading && !a.error && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <PlayCircle className="w-6 h-6 text-white drop-shadow" />
                              </div>
                            )}
                            {a.uploading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                              </div>
                            )}
                            {a.error && (
                              <div className="absolute inset-0 flex items-center justify-center bg-red-500/70 p-1">
                                <p className="text-[9px] text-white text-center leading-tight">{a.error}</p>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(a.localId)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {attachments.length < MAX_ATTACHMENTS && (
                      <label className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-500 cursor-pointer hover:border-cyan-400 hover:text-cyan-600 transition-colors">
                        <Camera className="w-4 h-4" /> Aggiungi foto o video
                        <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFilesSelected} />
                      </label>
                    )}
                  </div>
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

                  {r.media && r.media.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {r.media.map(m => (
                        <a key={m.id} href={m.media_url} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 block">
                          {m.media_type === 'video' ? (
                            <>
                              <video src={m.media_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <PlayCircle className="w-6 h-6 text-white drop-shadow" />
                              </div>
                            </>
                          ) : (
                            <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                          )}
                        </a>
                      ))}
                    </div>
                  )}

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
