#!/bin/bash
set -e
cd "$(dirname "$0")" 2>/dev/null || true
cd ~/mgshop-casa

echo "1/3 - Aggiorno public/sw.js (default home + immagine personalizzata)..."
python3 << 'PYEOF'
path = "public/sw.js"
with open(path, "r") as f:
    content = f.read()

old = """self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'MGShop Casa'
  const options = {
    body: data.body || 'Nuovo ordine ricevuto!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/mgadmin-panel', notificationId: data.notificationId || null },
    actions: [
      { action: 'open', title: 'Vedi ordine' },
      { action: 'close', title: 'Chiudi' }
    ]
  }
  event.waitUntil(self.registration.showNotification(title, options))
})"""

new = """self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'MGShop Casa'
  const options = {
    body: data.body || 'Nuovo ordine ricevuto!',
    // Se chi invia la notifica ha caricato un'immagine, sostituisce il logo
    // di default (icon-192.png) come icona della notifica.
    icon: data.imageUrl || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    // Le notifiche admin (nuovo ordine, chat...) passano sempre una url
    // esplicita. Per le notifiche ai clienti, se chi invia non ha scelto
    // un link, il default e' la home invece del pannello admin.
    data: { url: data.url || '/', notificationId: data.notificationId || null },
    actions: [
      { action: 'open', title: 'Apri' },
      { action: 'close', title: 'Chiudi' }
    ]
  }
  event.waitUntil(self.registration.showNotification(title, options))
})"""

if old not in content:
    raise SystemExit("ANCHOR non trovato in public/sw.js: controllo manuale necessario")
content = content.replace(old, new, 1)

with open(path, "w") as f:
    f.write(content)
print("public/sw.js aggiornato")
PYEOF

echo "2/3 - Aggiorno app/api/admin/push-notify/route.ts (accetta url e imageUrl)..."
python3 << 'PYEOF'
path = "app/api/admin/push-notify/route.ts"
with open(path, "r") as f:
    content = f.read()

old = """  const { title, body, url } = await request.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Titolo e messaggio sono obbligatori' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Nessun cliente iscritto alle notifiche' })
  }
  const { data: logRow } = await supabase
    .from('push_notifications_log')
    .insert({ title, body, sent_count: 0, failed_count: 0 })
    .select('id')
    .single()
  const notificationId = logRow?.id || null
  const payload = JSON.stringify({ title, body, url: url || '/', notificationId })"""

new = """  const { title, body, url, imageUrl } = await request.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Titolo e messaggio sono obbligatori' }, { status: 400 })
  }
  // Se non viene scelto un link, il click sulla notifica porta alla home
  // (non piu' al pannello admin, che per un cliente non ha senso).
  const finalUrl = (typeof url === 'string' && url.trim()) ? url.trim() : '/'
  const finalImageUrl = (typeof imageUrl === 'string' && imageUrl.trim()) ? imageUrl.trim() : null
  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Nessun cliente iscritto alle notifiche' })
  }
  const { data: logRow } = await supabase
    .from('push_notifications_log')
    .insert({ title, body, sent_count: 0, failed_count: 0, link_url: finalUrl, image_url: finalImageUrl })
    .select('id')
    .single()
  const notificationId = logRow?.id || null
  const payload = JSON.stringify({ title, body, url: finalUrl, imageUrl: finalImageUrl, notificationId })"""

if old not in content:
    raise SystemExit("ANCHOR non trovato in app/api/admin/push-notify/route.ts: controllo manuale necessario")
content = content.replace(old, new, 1)

with open(path, "w") as f:
    f.write(content)
print("app/api/admin/push-notify/route.ts aggiornato")
PYEOF

echo "3/3 - Aggiorno components/admin/customer-push-notify.tsx (link prodotto/categoria/personalizzato + immagine)..."
cat > components/admin/customer-push-notify.tsx << 'EOF'
"use client"
import { useState, useEffect, useRef } from 'react'
import { Send, Megaphone, Check, Users, Clock, Trash2, Pencil, X as XIcon, Link2, Package, Tag, ImagePlus, Loader2, Search } from 'lucide-react'
import { ImageCropper } from './image-cropper'

type HistoryItem = {
  id: string
  title: string
  body: string
  sent_count: number
  failed_count: number
  clicked_count: number
  created_at: string
  link_url?: string | null
  image_url?: string | null
}

type Subscriber = {
  id: string
  phone_number: string | null
  label: string | null
  created_at: string
}

type ProductResult = { id: string; name: string; cover_image?: string | null }
type Category = { id: string; name: string; slug: string }

type LinkTarget = 'none' | 'product' | 'category' | 'custom'

export function CustomerPushNotify() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState('')
  const [activeSubscriptions, setActiveSubscriptions] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [showList, setShowList] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingLabel, setSavingLabel] = useState(false)

  // --- Link della notifica: nessuno (apre la home), un prodotto specifico,
  // una categoria, o un link scritto a mano. ---
  const [linkTarget, setLinkTarget] = useState<LinkTarget>('none')
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<ProductResult[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('')
  const [customLink, setCustomLink] = useState('')

  // --- Immagine della notifica: se non caricata resta il logo di default. ---
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadStats = () => {
    fetch('/api/admin/push-notify')
      .then(r => r.json())
      .then(d => {
        setActiveSubscriptions(d.activeSubscriptions ?? 0)
        setHistory(d.history || [])
        setSubscribers(d.subscribers || [])
      })
      .catch(() => {})
  }

  useEffect(() => { loadStats() }, [])

  useEffect(() => {
    fetch('/api/admin/categories').then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  // Ricerca prodotti con un piccolo debounce, solo quando la scheda
  // "Prodotto" e' attiva e c'e' del testo digitato.
  useEffect(() => {
    if (linkTarget !== 'product' || !productQuery.trim()) { setProductResults([]); return }
    setSearchingProducts(true)
    const t = setTimeout(() => {
      fetch(`/api/shop/products?q=${encodeURIComponent(productQuery.trim())}`)
        .then(r => r.json())
        .then(d => setProductResults((d.products || []).slice(0, 6)))
        .catch(() => setProductResults([]))
        .finally(() => setSearchingProducts(false))
    }, 350)
    return () => clearTimeout(t)
  }, [productQuery, linkTarget])

  // Calcola il link finale da mandare in base alla scheda scelta.
  const resolvedLink = (() => {
    if (linkTarget === 'product') return selectedProduct ? `/prodotto/${selectedProduct.id}` : ''
    if (linkTarget === 'category') return selectedCategorySlug ? `/shop?categoria=${selectedCategorySlug}` : ''
    if (linkTarget === 'custom') return customLink.trim()
    return ''
  })()

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPendingImageFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCropConfirm = async (blob: Blob) => {
    setPendingImageFile(null)
    setUploadingImage(true)
    try {
      const file = new File([blob], 'notifica.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok && data.url) setUploadedImageUrl(data.url)
      else setError(data.error || 'Caricamento immagine fallito')
    } catch {
      setError('Caricamento immagine fallito, riprova')
    }
    setUploadingImage(false)
  }

  const resetLinkAndImage = () => {
    setLinkTarget('none'); setProductQuery(''); setProductResults([]); setSelectedProduct(null)
    setSelectedCategorySlug(''); setCustomLink(''); setUploadedImageUrl(null)
  }

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Scrivi titolo e messaggio')
      return
    }
    setSending(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/admin/push-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url: resolvedLink || undefined, imageUrl: uploadedImageUrl || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore invio'); setSending(false); return }
      setResult({ sent: data.sent, failed: data.failed })
      setTitle(''); setBody('')
      resetLinkAndImage()
      loadStats()
    } catch {
      setError('Errore di rete, riprova')
    }
    setSending(false)
  }

  const handleDelete = async (id: string) => {
    if (confirmingId !== id) {
      setConfirmingId(id)
      return
    }
    setDeletingId(id)
    try {
      await fetch('/api/admin/push-notify', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setHistory(h => h.filter(item => item.id !== id))
    } catch {
      setError('Errore durante eliminazione, riprova')
    }
    setDeletingId(null)
    setConfirmingId(null)
  }

  const startEdit = (s: Subscriber) => {
    setEditingId(s.id)
    setEditValue(s.label || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveLabel = async (id: string) => {
    setSavingLabel(true)
    try {
      const res = await fetch('/api/admin/push-notify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, label: editValue.trim() }),
      })
      if (res.ok) {
        setSubscribers(list => list.map(s => s.id === id ? { ...s, label: editValue.trim() || null } : s))
        setEditingId(null)
        setEditValue('')
      }
    } catch {}
    setSavingLabel(false)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      {pendingImageFile && (
        <ImageCropper
          file={pendingImageFile}
          onCancel={() => setPendingImageFile(null)}
          onConfirm={handleCropConfirm}
          outputWidth={400}
          aspectRatio={1}
          minZoom={1}
        />
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Megaphone className="w-5 h-5 text-cyan-600" />
          <h2 className="font-bold text-slate-800">Invia notifica ai clienti</h2>
        </div>
        <p className="text-sm text-slate-500 -mt-1 mb-4">
          Il messaggio arriva sul telefono di chi ha attivato le notifiche.
        </p>

        <button onClick={() => setShowList(v => !v)} className="w-full flex items-center gap-2 p-3 rounded-xl mb-2 text-left" style={{ background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.15)' }}>
          <Users className="w-4 h-4 text-cyan-700 shrink-0" />
          <span className="text-sm text-cyan-800 flex-1">
            <strong>{activeSubscriptions ?? '...'}</strong> {activeSubscriptions === 1 ? 'persona ha' : 'persone hanno'} attivato le notifiche
          </span>
          <span className="text-xs text-cyan-600 underline">{showList ? 'Nascondi' : 'Vedi elenco'}</span>
        </button>

        {showList && (
          <div className="mb-4 rounded-xl border border-slate-100 divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {subscribers.length === 0 ? (
              <p className="text-sm text-slate-400 p-3">Nessun iscritto ancora.</p>
            ) : subscribers.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                {editingId === s.id ? (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveLabel(s.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      placeholder="Nome cliente"
                      className="flex-1 min-w-0 h-8 px-2 rounded-lg text-sm border border-cyan-300 outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={() => saveLabel(s.id)}
                      disabled={savingLabel}
                      className="shrink-0 p-1.5 rounded-lg text-cyan-700"
                      style={{ background: 'rgba(8,145,178,0.1)' }}
                      title="Salva"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelEdit} className="shrink-0 p-1.5 rounded-lg text-slate-400" title="Annulla">
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate">
                        {s.label || s.phone_number || 'Anonimo (nessun numero)'}
                      </p>
                      {s.label && s.phone_number && (
                        <p className="text-xs text-slate-400">{s.phone_number}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      <button onClick={() => startEdit(s)} className="p-1 text-slate-300 hover:text-cyan-600" title="Rinomina">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Titolo</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Es: Nuova offerta!"
              className="w-full h-11 px-4 rounded-xl text-base outline-none border border-slate-200 focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Messaggio</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Es: Sconto 20% su tutta la pasta, solo oggi!"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-base outline-none border border-slate-200 focus:border-cyan-400 resize-none"
            />
          </div>

          {/* Immagine notifica */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Immagine (opzionale)</label>
            <p className="text-xs text-slate-400 mb-1.5">Se non carichi nulla, resta il logo di MGShop.</p>
            {uploadedImageUrl ? (
              <div className="flex items-center gap-3 p-2 rounded-xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadedImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                <span className="text-xs text-slate-500 flex-1">Immagine caricata</span>
                <button onClick={() => setUploadedImageUrl(null)} className="p-1.5 text-slate-400 hover:text-red-500">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-dashed disabled:opacity-60"
                style={{ borderColor: 'rgba(8,145,178,0.3)', color: '#0891b2' }}
              >
                {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {uploadingImage ? 'Caricamento...' : 'Carica immagine'}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
          </div>

          {/* Link della notifica */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Dove porta il click sulla notifica</label>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {([
                { key: 'none', label: 'Home', icon: Link2 },
                { key: 'product', label: 'Prodotto', icon: Package },
                { key: 'category', label: 'Categoria', icon: Tag },
                { key: 'custom', label: 'Link', icon: Search },
              ] as { key: LinkTarget; label: string; icon: typeof Link2 }[]).map(opt => {
                const Icon = opt.icon
                const active = linkTarget === opt.key
                return (
                  <button key={opt.key} type="button" onClick={() => setLinkTarget(opt.key)}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-colors"
                    style={active ? { background: 'rgba(8,145,178,0.1)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.3)' } : { background: 'rgba(148,163,184,0.06)', color: '#64748b', border: '1px solid transparent' }}>
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {linkTarget === 'product' && (
              <div className="space-y-1.5">
                {selectedProduct ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'rgba(8,145,178,0.06)' }}>
                    <span className="text-sm text-slate-700 truncate">{selectedProduct.name}</span>
                    <button onClick={() => setSelectedProduct(null)} className="p-1 text-slate-400 hover:text-red-500 shrink-0"><XIcon className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <>
                    <input
                      value={productQuery}
                      onChange={e => setProductQuery(e.target.value)}
                      placeholder="Cerca prodotto per nome..."
                      className="w-full h-9 px-3 rounded-lg text-sm border border-slate-200 outline-none focus:border-cyan-400"
                    />
                    {searchingProducts && <p className="text-xs text-slate-400 px-1">Cerco...</p>}
                    {productResults.length > 0 && (
                      <div className="rounded-lg border border-slate-100 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                        {productResults.map(p => (
                          <button key={p.id} onClick={() => { setSelectedProduct(p); setProductQuery('') }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 truncate">
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {linkTarget === 'category' && (
              <select
                value={selectedCategorySlug}
                onChange={e => setSelectedCategorySlug(e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-sm border border-slate-200 outline-none focus:border-cyan-400 bg-white"
              >
                <option value="">Scegli una categoria...</option>
                {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            )}

            {linkTarget === 'custom' && (
              <input
                value={customLink}
                onChange={e => setCustomLink(e.target.value)}
                placeholder="Es: /promo oppure /lotteria"
                className="w-full h-9 px-3 rounded-lg text-sm font-mono border border-slate-200 outline-none focus:border-cyan-400"
              />
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {result && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 text-green-700 text-sm">
              <Check className="w-4 h-4" />
              Inviata a {result.sent} client{result.sent === 1 ? 'e' : 'i'}
              {result.failed > 0 && ` (${result.failed} non raggiungibili)`}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}
          >
            <Send className="w-4 h-4" />
            {sending ? 'Invio in corso...' : 'Invia notifica'}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-600">Storico invii</h3>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-slate-400">Nessuna notifica inviata finora.</p>
        ) : (
          <div className="space-y-2">
            {history.map(item => (
              <div key={item.id} className="p-3 rounded-xl border border-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    )}
                    <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400">{formatDate(item.created_at)}</span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      title={confirmingId === item.id ? 'Conferma eliminazione' : 'Elimina'}
                      className="p-1 rounded-lg transition-colors disabled:opacity-50"
                      style={confirmingId === item.id ? { background: 'rgba(220,38,38,0.1)' } : undefined}
                    >
                      <Trash2 className={`w-3.5 h-3.5 ${confirmingId === item.id ? 'text-red-600' : 'text-slate-300'}`} />
                    </button>
                  </div>
                </div>
                {confirmingId === item.id && (
                  <p className="text-xs text-red-500 mt-1">Tocca di nuovo il cestino per confermare l'eliminazione</p>
                )}
                <p className="text-sm text-slate-500 mt-0.5">{item.body}</p>
                <p className="text-xs text-slate-400 mt-1.5">
                  Raggiunte {item.sent_count} persone · {item.clicked_count || 0} click
                  {item.failed_count > 0 && ` · ${item.failed_count} non raggiungibili`}
                  {item.link_url && item.link_url !== '/' && (
                    <> · <span className="text-cyan-600">apre {item.link_url}</span></>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
EOF

echo ""
echo "✅ Fatto! File modificati:"
echo "   - public/sw.js"
echo "   - app/api/admin/push-notify/route.ts"
echo "   - components/admin/customer-push-notify.tsx"
echo ""
echo "Colonne link_url e image_url gia' aggiunte a push_notifications_log su Supabase."
echo ""
echo "Ora testa in locale con: npm run dev"
echo "Se va tutto bene:"
echo "   git add -A"
echo "   git commit -m 'Link personalizzato e immagine nelle notifiche ai clienti'"
echo "   git push"
