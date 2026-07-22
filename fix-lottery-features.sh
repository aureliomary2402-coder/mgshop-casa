#!/bin/bash
set -e

# Esegui questo script dalla cartella del repo (cd ~/mgshop)

mkdir -p "lib"
cat > "lib/lottery.ts" << 'LOTTERYEOF'
import { createAdminClient } from './supabase/admin'

type SupabaseAdmin = ReturnType<typeof createAdminClient>

/**
 * Se la lotteria è attiva e il tempo è scaduto, la archivia da sola nello
 * storico vincitori e la rimette in bozza — senza bisogno che l'admin
 * clicchi manualmente "Archivia". Viene richiamata sia dalla pagina
 * pubblica /api/lottery sia dal pannello admin, così basta che qualcuno
 * (cliente o admin) apra una delle due pagine dopo la scadenza perché
 * l'archiviazione scatti da sola.
 *
 * L'update usa `.eq('is_active', true)` come "lucchetto": se due richieste
 * arrivano nello stesso istante, solo una riesce ad aggiornare la riga
 * (l'altra trova is_active già false) — così non si crea mai un doppione
 * nello storico vincitori.
 */
export async function autoArchiveIfExpired(supabase: SupabaseAdmin, lottery: any) {
  if (!lottery || !lottery.is_active || !lottery.ends_at) return lottery
  if (new Date(lottery.ends_at).getTime() > Date.now()) return lottery

  const { data: claimed } = await supabase.from('lottery')
    .update({ is_active: false, status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', lottery.id)
    .eq('is_active', true)
    .select()
    .single()

  if (claimed) {
    await supabase.from('lottery_winners').insert({
      lottery_title: lottery.title,
      prize_label: lottery.prize_label,
      prize_image_url: lottery.image_url,
      winner_number: lottery.winner_number,
      participants_count: lottery.participants_count,
    })
    return claimed
  }

  // Un'altra richiesta concorrente ha già archiviato nel frattempo:
  // rileggiamo lo stato aggiornato invece di restituire quello vecchio.
  const { data: fresh } = await supabase.from('lottery').select('*').eq('id', lottery.id).single()
  return fresh || lottery
}
LOTTERYEOF

mkdir -p "app/api/lottery"
cat > "app/api/lottery/route.ts" << 'LOTTERYEOF'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoArchiveIfExpired } from '@/lib/lottery'

// Senza questa riga, Next.js mette in cache questa risposta GET la prima volta
// e la serve sempre uguale (congelata) finché non c'è un nuovo deploy.
// Qui invece serve sempre lo stato reale e aggiornato del database.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const supabase = createAdminClient()
  let { data: lottery } = await supabase.from('lottery').select('*').limit(1).single()
  // Se il conto alla rovescia è scaduto, archivia da sola l'estrazione
  // nello storico vincitori (nessun click manuale richiesto).
  if (lottery) lottery = await autoArchiveIfExpired(supabase, lottery)
  const { data: winners } = await supabase.from('lottery_winners').select('*').order('drawn_at', { ascending: false }).limit(30)

  if (!lottery) {
    return NextResponse.json({ is_active: false, winners: winners || [] })
  }

  const revealed = !!lottery.ends_at && new Date(lottery.ends_at).getTime() <= Date.now()

  return NextResponse.json({
    is_active: lottery.is_active,
    title: lottery.title,
    description: lottery.description,
    image_url: lottery.image_url,
    prize_label: lottery.prize_label,
    participants_count: lottery.participants_count,
    ends_at: lottery.ends_at,
    revealed,
    winner_number: revealed ? lottery.winner_number : null,
    winners: winners || [],
  })
}
LOTTERYEOF

mkdir -p "app/api/admin/lottery"
cat > "app/api/admin/lottery/route.ts" << 'LOTTERYEOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoArchiveIfExpired } from '@/lib/lottery'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

// La tabella "lottery" deve sempre avere esattamente una riga: tutto il
// pannello admin fa solo UPDATE su quella riga, mai INSERT. Se la riga
// manca (es. cancellata per errore, tabella svuotata a mano) la creiamo
// qui al volo con i valori di default, invece di rispondere 404 e
// bloccare per sempre il salvataggio dal pannello.
async function getOrCreateLotteryRow(supabase: ReturnType<typeof createAdminClient>) {
  const { data: existing } = await supabase.from('lottery').select('*').limit(1).single()
  if (existing) return autoArchiveIfExpired(supabase, existing)

  const { data: created, error } = await supabase.from('lottery').insert({
    is_active: false,
    title: '',
    description: '',
    prize_type: 'custom',
    prize_label: '',
    participants_count: 10,
    winner_number: 1,
    status: 'draft',
  }).select().single()

  if (error || !created) return null
  return created
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const data = await getOrCreateLotteryRow(supabase)
  if (!data) return NextResponse.json({ error: 'Impossibile creare la riga lotteria' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()
  const existing = await getOrCreateLotteryRow(supabase)
  if (!existing) return NextResponse.json({ error: 'Impossibile creare la riga lotteria' }, { status: 500 })

  const participants = Math.min(500, Math.max(2, parseInt(body.participants_count) || 2))
  const winner = Math.min(participants, Math.max(1, parseInt(body.winner_number) || 1))
  // Nuovo turno: se la lotteria viene (ri)attivata partendo da spenta, i numeri
  // assegnati ai clienti al checkout devono ripartire da 1.
  const isNewRound = body.is_active === true && existing.is_active !== true

  const { data, error } = await supabase.from('lottery').update({
    title: body.title || '',
    description: body.description || '',
    image_url: body.image_url || null,
    prize_type: body.prize_type || 'custom',
    prize_product_id: body.prize_type === 'product' ? (body.prize_product_id || null) : null,
    prize_coupon_id: body.prize_type === 'coupon' ? (body.prize_coupon_id || null) : null,
    prize_label: body.prize_label || '',
    participants_count: participants,
    winner_number: winner,
    ends_at: body.ends_at || null,
    is_active: body.is_active ?? false,
    status: body.is_active ? 'running' : 'draft',
    updated_at: new Date().toISOString(),
    ...(isNewRound ? { round_id: crypto.randomUUID() } : {}),
  }).eq('id', existing.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
LOTTERYEOF

mkdir -p "app/api/admin/lottery/entries"
cat > "app/api/admin/lottery/entries/route.ts" << 'LOTTERYEOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Elenco dei clienti che hanno davvero partecipato (pagato +1€) al turno
// attuale della lotteria, con il numero che è stato loro assegnato.
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()

  const { data: lottery } = await supabase.from('lottery').select('round_id').limit(1).single()
  if (!lottery?.round_id) return NextResponse.json({ entries: [] })

  const { data, error } = await supabase
    .from('orders')
    .select('id, phone_number, customer_name, lottery_number, created_at')
    .eq('lottery_round', lottery.round_id)
    .not('lottery_number', 'is', null)
    .order('lottery_number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data || [] })
}

// Rinomina un partecipante (es. quando si scopre il nome del cliente,
// come si fa già per gli ordini normali).
export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.order_id) return NextResponse.json({ error: 'order_id mancante' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('orders')
    .update({ customer_name: (body.customer_name || '').trim() || null })
    .eq('id', body.order_id)
    .select('id, phone_number, customer_name, lottery_number, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

// Rimuove un cliente dal turno attuale della lotteria: l'ordine resta
// salvato normalmente, semplicemente non partecipa più all'estrazione.
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.order_id) return NextResponse.json({ error: 'order_id mancante' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('orders')
    .update({ lottery_number: null, lottery_round: null })
    .eq('id', body.order_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
LOTTERYEOF

mkdir -p "app/api/admin/lottery/winners/[id]"
cat > "app/api/admin/lottery/winners/[id]/route.ts" << 'LOTTERYEOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('lottery_winners').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
LOTTERYEOF

mkdir -p "components/admin"
cat > "components/admin/lottery-manager.tsx" << 'LOTTERYEOF'
"use client"

import { useState, useEffect } from 'react'
import { ToggleLeft, ToggleRight, ImageIcon, Save, Eye, Clock, Gift, Search, Award, History, Sparkles, Phone, Trash2, Pencil, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Product } from '@/lib/types'
import { ImageCropper } from './image-cropper'

interface Coupon { id: string; code: string; discount_percent: number; discount_fixed: number }
interface Winner { id: string; lottery_title: string; prize_label: string; prize_image_url: string | null; winner_number: number; participants_count: number; drawn_at: string }
interface Entry { id: string; phone_number: string; customer_name: string | null; lottery_number: number; created_at: string }
type PrizeType = 'product' | 'coupon' | 'custom'

// Converte una data ISO (UTC, come arriva da Supabase) nel formato
// "YYYY-MM-DDTHH:mm" richiesto da <input type="datetime-local">,
// usando l'ora LOCALE del browser (non UTC), altrimenti l'orario mostrato si sfasa.
function isoToLocalInputValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function LotteryManager() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [prizeType, setPrizeType] = useState<PrizeType>('custom')
  const [prizeProductId, setPrizeProductId] = useState('')
  const [prizeCouponId, setPrizeCouponId] = useState('')
  const [prizeLabel, setPrizeLabel] = useState('')
  const [participantsCount, setParticipantsCount] = useState('10')
  const [winnerNumber, setWinnerNumber] = useState('1')
  const [endsAt, setEndsAt] = useState('')
  const [isActive, setIsActive] = useState(false)

  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [winners, setWinners] = useState<Winner[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    fetch('/api/admin/lottery').then(r => r.json()).then(d => {
      setTitle(d.title || '')
      setDescription(d.description || '')
      setImageUrl(d.image_url || '')
      setPrizeType(d.prize_type || 'custom')
      setPrizeProductId(d.prize_product_id || '')
      setPrizeCouponId(d.prize_coupon_id || '')
      setPrizeLabel(d.prize_label || '')
      setParticipantsCount(String(d.participants_count || 10))
      setWinnerNumber(String(d.winner_number || 1))
      setEndsAt(d.ends_at ? isoToLocalInputValue(d.ends_at) : '')
      setIsActive(d.is_active === true)
      setLoading(false)
    }).catch(() => setLoading(false))
    fetch('/api/lottery').then(r => r.json()).then(d => setWinners(d.winners || [])).catch(() => {})
    fetch('/api/admin/lottery/entries').then(r => r.json()).then(d => setEntries(d.entries || [])).catch(() => {})
  }

  useEffect(() => {
    load()
    fetch('/api/admin/products').then(r => r.json()).then(setAllProducts).catch(() => {})
    fetch('/api/admin/coupons').then(r => r.json()).then(setCoupons).catch(() => {})
  }, [])

  const participantsNum = Math.min(500, Math.max(2, parseInt(participantsCount) || 2))

  const handleSave = async () => {
    // La validazione di titolo/premio serve solo per una lotteria che deve
    // essere mostrata ai clienti. Se la stai disattivando (o svuotando),
    // il salvataggio deve comunque passare, altrimenti resta tutto come prima.
    if (isActive) {
      if (!title.trim()) { setError('Inserisci un titolo'); return }
      if (!prizeLabel.trim()) { setError('Inserisci o seleziona un premio'); return }
    }
    const winnerNum = Math.min(participantsNum, Math.max(1, parseInt(winnerNumber) || 1))
    setSaving(true); setError('')
    const res = await fetch('/api/admin/lottery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, description, image_url: imageUrl || null,
        prize_type: prizeType, prize_product_id: prizeProductId || null, prize_coupon_id: prizeCouponId || null,
        prize_label: prizeLabel, participants_count: participantsNum, winner_number: winnerNum,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null, is_active: isActive,
      })
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); setWinnerNumber(String(winnerNum)) }
    else {
      const data = await res.json().catch(() => null)
      setError(data?.error ? `Errore salvataggio: ${data.error}` : 'Errore salvataggio')
    }
    setSaving(false)
  }

  const handleDraw = async () => {
    if (!confirm('Archiviare la lotteria attuale nello storico vincitori e disattivarla? Potrai impostarne subito una nuova.')) return
    setDrawing(true)
    const res = await fetch('/api/admin/lottery/draw', { method: 'POST' })
    if (res.ok) load()
    else setError('Errore archiviazione')
    setDrawing(false)
  }

  const startEditEntry = (e: Entry) => {
    setEditingEntryId(e.id)
    setEditingName(e.customer_name || '')
  }

  const saveEntryName = async (id: string) => {
    const res = await fetch('/api/admin/lottery/entries', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: id, customer_name: editingName }),
    })
    setEditingEntryId(null)
    if (res.ok) {
      fetch('/api/admin/lottery/entries').then(r => r.json()).then(d => setEntries(d.entries || [])).catch(() => {})
    } else setError('Errore nel salvare il nome')
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('Rimuovere questo partecipante dalla lotteria? Il suo ordine resta salvato, ma non parteciperà più a questa estrazione.')) return
    const res = await fetch('/api/admin/lottery/entries', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: id }),
    })
    if (res.ok) setEntries(prev => prev.filter(e => e.id !== id))
    else setError('Errore nella rimozione del partecipante')
  }

  const deleteWinner = async (id: string) => {
    if (!confirm('Eliminare questa estrazione dallo storico? Non si può annullare.')) return
    const res = await fetch(`/api/admin/lottery/winners/${id}`, { method: 'DELETE' })
    if (res.ok) setWinners(prev => prev.filter(w => w.id !== id))
    else setError('Errore nell\'eliminazione dello storico')
  }

  const selectProduct = (p: Product) => {
    setPrizeProductId(p.id)
    setPrizeLabel(p.name)
    if (!imageUrl && p.cover_image) setImageUrl(p.cover_image)
    setShowProductPicker(false)
  }

  const selectCoupon = (c: Coupon) => {
    setPrizeCouponId(c.id)
    const discount = c.discount_percent ? `${c.discount_percent}%` : `euro${c.discount_fixed.toFixed(2)}`
    setPrizeLabel(`Coupon ${c.code} - sconto ${discount}`)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCropFile(file)
    e.target.value = ''
  }

  const handleCropConfirm = async (blob: Blob) => {
    setCropFile(null); setUploading(true)
    try {
      const croppedFile = new File([blob], 'lottery.jpg', { type: 'image/jpeg' })
      const formData = new FormData()
      formData.append('file', croppedFile)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setImageUrl(data.url)
    } catch { console.error('Upload failed') }
    setUploading(false)
  }

  const filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))

  if (loading) return <div className="text-center py-8 text-slate-400">Caricamento...</div>

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="flex items-center justify-between p-4 rounded-2xl border"
        style={{ background: isActive ? 'rgba(8,145,178,0.06)' : 'rgba(0,0,0,0.02)', borderColor: isActive ? 'rgba(8,145,178,0.2)' : 'rgba(0,0,0,0.08)' }}>
        <div>
          <p className="font-semibold text-slate-800">Pagina Lotteria</p>
          <p className="text-xs mt-0.5">
            {isActive ? <span className="text-cyan-600 font-medium">Attiva — ricordati di salvare!</span> : <span className="text-slate-400">Disattivata — ricordati di salvare!</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <Link href="/lotteria" target="_blank" className="flex items-center gap-1.5 text-xs text-cyan-700 font-medium px-3 py-1.5 rounded-lg border border-cyan-200 hover:bg-cyan-50">
              <Eye className="w-3.5 h-3.5" /> Vedi
            </Link>
          )}
          <button onClick={() => setIsActive(v => !v)} className="focus:outline-none hover:scale-110 transition-transform">
            {isActive ? <ToggleRight className="w-10 h-10 text-cyan-600" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
          </button>
        </div>
      </div>

      <div className="p-3 rounded-xl text-xs text-cyan-700 font-medium" style={{ background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.15)' }}>
        Il numero vincente resta nascosto ai clienti finché il conto alla rovescia non scade. Dopo ogni modifica clicca Salva.
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Titolo</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. Lotteria di Ferragosto" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Testo / descrizione</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Regolamento, come partecipare, ecc." />
        </div>

        {/* Tipo premio */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> Premio</label>
          <div className="flex gap-1.5 mb-3">
            {[{ id: 'product', label: 'Prodotto' }, { id: 'coupon', label: 'Coupon' }, { id: 'custom', label: 'Testo libero' }].map(opt => (
              <button key={opt.id} type="button" onClick={() => setPrizeType(opt.id as PrizeType)}
                className="flex-1 text-xs font-semibold py-2 rounded-lg border transition-colors"
                style={prizeType === opt.id
                  ? { background: 'rgba(8,145,178,0.12)', borderColor: 'rgba(8,145,178,0.4)', color: '#0e7490' }
                  : { background: 'transparent', borderColor: 'rgba(0,0,0,0.1)', color: '#78716c' }}>
                {opt.label}
              </button>
            ))}
          </div>

          {prizeType === 'product' && (
            <div className="mb-3">
              <button onClick={() => setShowProductPicker(v => !v)}
                className="w-full flex items-center gap-1 text-xs text-cyan-700 font-medium px-3 py-2 rounded-lg border border-cyan-200 hover:bg-cyan-50 transition-colors justify-center">
                <Search className="w-3.5 h-3.5" /> {prizeProductId ? 'Cambia prodotto' : 'Scegli prodotto dal catalogo'}
              </button>
              {showProductPicker && (
                <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
                  <div className="p-2 border-b border-slate-100">
                    <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Cerca prodotto..." className="h-9 text-sm" />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <button key={p.id} onClick={() => selectProduct(p)}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 ${prizeProductId === p.id ? 'bg-cyan-50' : ''}`}>
                        {p.cover_image ? <img src={p.cover_image} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0" />}
                        <p className="text-sm font-medium text-slate-800 truncate flex-1">{p.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {prizeType === 'coupon' && (
            <div className="mb-3 space-y-1.5">
              {coupons.length === 0 && <p className="text-xs text-slate-400">Nessun coupon disponibile: creane uno nella sezione Coupon.</p>}
              {coupons.map(c => (
                <button key={c.id} onClick={() => selectCoupon(c)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors ${prizeCouponId === c.id ? 'bg-cyan-50 border-cyan-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <span className="text-sm font-medium text-slate-800">{c.code}</span>
                  <span className="text-xs text-cyan-700 font-bold">{c.discount_percent ? `${c.discount_percent}%` : `euro${c.discount_fixed.toFixed(2)}`}</span>
                </button>
              ))}
            </div>
          )}

          <label className="text-xs font-medium text-slate-500 mb-1 block">Descrizione premio (mostrata ai clienti)</label>
          <Input value={prizeLabel} onChange={e => setPrizeLabel(e.target.value)} placeholder="Es. Un set di detersivi per la casa" />
        </div>

        {/* Immagine */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Foto del premio</label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-cyan-700 font-medium">
            <ImageIcon className="w-4 h-4" /> {uploading ? 'Caricamento...' : 'Carica e ritaglia foto'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} disabled={uploading} />
          </label>
          {imageUrl && (
            <div className="mt-2 relative w-32">
              <div className="rounded-xl overflow-hidden aspect-square bg-slate-100"><img src={imageUrl} alt="preview" className="w-full h-full object-cover" /></div>
              <button onClick={() => setImageUrl('')} className="absolute top-1.5 right-1.5 bg-red-500 text-white text-xs px-2 py-1 rounded-lg">Rimuovi</button>
            </div>
          )}
        </div>

        {/* Partecipanti e vincitore */}
        <div className="p-3 rounded-xl" style={{ background: 'rgba(8,145,178,0.05)', border: '1px solid rgba(8,145,178,0.12)' }}>
          <p className="text-xs font-medium text-cyan-700 mb-2 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Partecipanti reali di questo turno ({entries.length})</p>
          {entries.length === 0 && <p className="text-xs text-slate-400">Ancora nessun cliente ha aggiunto +1€ al checkout in questo turno.</p>}
          {entries.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {entries.map(e => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-xs bg-white rounded-lg px-2.5 py-1.5">
                  {editingEntryId === e.id ? (
                    <>
                      <Input value={editingName} onChange={ev => setEditingName(ev.target.value)}
                        placeholder={e.phone_number} className="h-7 text-xs flex-1" autoFocus
                        onKeyDown={ev => { if (ev.key === 'Enter') saveEntryName(e.id); if (ev.key === 'Escape') setEditingEntryId(null) }} />
                      <button onClick={() => saveEntryName(e.id)} className="text-green-600 shrink-0"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingEntryId(null)} className="text-slate-400 shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-600 truncate flex-1">{e.customer_name || e.phone_number}</span>
                      <span className="font-bold text-cyan-700 shrink-0">#{e.lottery_number}</span>
                      <button onClick={() => startEditEntry(e)} className="text-slate-400 hover:text-cyan-600 shrink-0"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteEntry(e.id)} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2">Usa questo elenco per impostare "Numero partecipanti" e "Numero vincente" qui sotto in modo coerente con chi ha davvero partecipato.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Numero partecipanti</label>
            <Input type="number" min={2} max={500} value={participantsCount} onChange={e => setParticipantsCount(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Numero vincente</label>
            <Input type="number" min={1} max={participantsNum} value={winnerNumber} onChange={e => setWinnerNumber(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-slate-400 -mt-2">
          Allo scadere del tempo, tutte le bolle scoppieranno tranne il numero {Math.min(participantsNum, Math.max(1, parseInt(winnerNumber) || 1))}, che resterà come vincitore.
        </p>

        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Estrazione (conto alla rovescia fino a)</label>
          <Input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700 text-base py-6">
        <Save className="w-5 h-5" />
        {saved ? 'Salvato!' : saving ? 'Salvataggio...' : 'Salva modifiche'}
      </Button>

      <p className="text-xs text-slate-400 text-center">
        Allo scadere del conto alla rovescia l'estrazione si archivia da sola nello storico. Usa il pulsante sotto solo se vuoi chiuderla subito, prima della scadenza.
      </p>
      <Button onClick={handleDraw} disabled={drawing} variant="outline" className="w-full gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
        <Sparkles className="w-4 h-4" />
        {drawing ? 'Archiviazione...' : 'Chiudi ora e archivia nello storico'}
      </Button>

      {/* Storico */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1"><History className="w-3.5 h-3.5" /> Storico vincitori ({winners.length})</p>
        <div className="space-y-2">
          {winners.map(w => (
            <div key={w.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-white">
              {w.prize_image_url ? <img src={w.prize_image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{w.lottery_title}</p>
                <p className="text-xs text-slate-400 truncate">{w.prize_label} · Numero #{w.winner_number} su {w.participants_count}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0">{new Date(w.drawn_at).toLocaleDateString('it-IT')}</span>
              <button onClick={() => deleteWinner(w.id)} className="text-slate-300 hover:text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {winners.length === 0 && <p className="text-xs text-slate-400 text-center py-3">Ancora nessuna estrazione archiviata</p>}
        </div>
      </div>

      {cropFile && (
        <ImageCropper file={cropFile} aspectRatio={1} outputWidth={1200} onCancel={() => setCropFile(null)} onConfirm={handleCropConfirm} />
      )}
    </div>
  )
}
LOTTERYEOF

git add lib/lottery.ts app/api/lottery/route.ts app/api/admin/lottery/route.ts app/api/admin/lottery/entries/route.ts "app/api/admin/lottery/winners/[id]/route.ts" components/admin/lottery-manager.tsx
git commit -m "feat: gestione partecipanti lotteria (rinomina/elimina), auto-archiviazione estrazione, elimina storico"
git push
