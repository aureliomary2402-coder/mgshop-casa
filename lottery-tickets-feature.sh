#!/bin/bash
set -e

# Esegui questo script dalla cartella del repo (cd ~/mgshop)

mkdir -p "app/api/lottery/tickets"
cat > "app/api/lottery/tickets/route.ts" << 'TICKETEOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoArchiveIfExpired } from '@/lib/lottery'

export async function POST(request: NextRequest) {
  try {
    const { phone_number, customer_name, quantity } = await request.json()
    const phone = (phone_number || '').trim()
    const qty = Math.min(20, Math.max(1, parseInt(quantity) || 1))

    if (!phone) return NextResponse.json({ error: 'Numero di telefono mancante' }, { status: 400 })

    const supabase = createAdminClient()
    let { data: lottery } = await supabase.from('lottery').select('*').limit(1).single()
    if (lottery) lottery = await autoArchiveIfExpired(supabase, lottery)

    if (!lottery?.is_active || !lottery.round_id) {
      return NextResponse.json({ error: 'La lotteria non è più attiva' }, { status: 400 })
    }

    // Il numero progressivo tiene conto sia dei biglietti acquistati qui,
    // sia dei numeri già assegnati con l'opt-in +1€ al checkout normale.
    const [{ count: orderCount }, { count: ticketCount }] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('lottery_round', lottery.round_id).not('lottery_number', 'is', null),
      supabase.from('lottery_tickets').select('id', { count: 'exact', head: true })
        .eq('round_id', lottery.round_id),
    ])

    const start = (orderCount || 0) + (ticketCount || 0) + 1
    const numbers = Array.from({ length: qty }, (_, i) => start + i)

    const { data: inserted, error } = await supabase.from('lottery_tickets').insert(
      numbers.map(n => ({
        round_id: lottery.round_id,
        lottery_number: n,
        phone_number: phone,
        customer_name: (customer_name || '').trim() || null,
      }))
    ).select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notifica push all'admin, come per i nuovi ordini
    const baseUrl = request.headers.get('origin') || 'https://mgshop-2.vercel.app'
    fetch(`${baseUrl}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Biglietti lotteria acquistati!',
        body: `${phone} — ${qty} biglietto${qty > 1 ? 'i' : ''} — €${qty.toFixed(2)}`,
        url: '/mgadmin-panel',
      }),
    }).catch(() => {})

    return NextResponse.json({ success: true, numbers, tickets: inserted })
  } catch {
    return NextResponse.json({ error: 'Acquisto biglietti non riuscito' }, { status: 500 })
  }
}
TICKETEOF

mkdir -p "app/api/admin/lottery/entries"
cat > "app/api/admin/lottery/entries/route.ts" << 'TICKETEOF'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Elenco di chi partecipa al turno attuale della lotteria: sia chi ha
// spuntato "+1€" durante un acquisto normale (righe nella tabella orders),
// sia chi ha comprato biglietti a parte senza acquistare altro (righe nella
// tabella lottery_tickets). Le due liste vengono unite e ordinate per numero.
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()

  const { data: lottery } = await supabase.from('lottery').select('round_id').limit(1).single()
  if (!lottery?.round_id) return NextResponse.json({ entries: [] })

  const [{ data: orderEntries, error: ordersError }, { data: ticketEntries, error: ticketsError }] = await Promise.all([
    supabase.from('orders')
      .select('id, phone_number, customer_name, lottery_number, created_at')
      .eq('lottery_round', lottery.round_id)
      .not('lottery_number', 'is', null),
    supabase.from('lottery_tickets')
      .select('id, phone_number, customer_name, lottery_number, created_at')
      .eq('round_id', lottery.round_id),
  ])

  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 })
  if (ticketsError) return NextResponse.json({ error: ticketsError.message }, { status: 500 })

  const entries = [
    ...(orderEntries || []).map(e => ({ ...e, source: 'order' as const })),
    ...(ticketEntries || []).map(e => ({ ...e, source: 'ticket' as const })),
  ].sort((a, b) => a.lottery_number - b.lottery_number)

  return NextResponse.json({ entries })
}

// Rinomina un partecipante (es. quando si scopre il nome del cliente,
// come si fa già per gli ordini normali). "source" dice se il numero viene
// da un ordine normale o da un biglietto acquistato a parte.
export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  const supabase = createAdminClient()
  const table = body.source === 'ticket' ? 'lottery_tickets' : 'orders'
  const { data, error } = await supabase.from(table)
    .update({ customer_name: (body.customer_name || '').trim() || null })
    .eq('id', body.id)
    .select('id, phone_number, customer_name, lottery_number, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: { ...data, source: body.source === 'ticket' ? 'ticket' : 'order' } })
}

// Rimuove un partecipante dal turno attuale. Se veniva da un ordine normale,
// l'ordine resta salvato e viene solo scollegato dalla lotteria; se veniva
// da un biglietto acquistato a parte, il biglietto viene eliminato del tutto.
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  const supabase = createAdminClient()

  if (body.source === 'ticket') {
    const { error } = await supabase.from('lottery_tickets').delete().eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('orders')
      .update({ lottery_number: null, lottery_round: null })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
TICKETEOF

mkdir -p "components/admin"
cat > "components/admin/lottery-manager.tsx" << 'TICKETEOF'
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
interface Entry { id: string; phone_number: string; customer_name: string | null; lottery_number: number; created_at: string; source: 'order' | 'ticket' }
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

  const saveEntryName = async (id: string, source: 'order' | 'ticket') => {
    const res = await fetch('/api/admin/lottery/entries', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, source, customer_name: editingName }),
    })
    setEditingEntryId(null)
    if (res.ok) {
      fetch('/api/admin/lottery/entries').then(r => r.json()).then(d => setEntries(d.entries || [])).catch(() => {})
    } else setError('Errore nel salvare il nome')
  }

  const deleteEntry = async (id: string, source: 'order' | 'ticket') => {
    const msg = source === 'ticket'
      ? 'Eliminare questo biglietto acquistato? L\'operazione non si può annullare.'
      : 'Rimuovere questo partecipante dalla lotteria? Il suo ordine resta salvato, ma non parteciperà più a questa estrazione.'
    if (!confirm(msg)) return
    const res = await fetch('/api/admin/lottery/entries', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, source }),
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
                        onKeyDown={ev => { if (ev.key === 'Enter') saveEntryName(e.id, e.source); if (ev.key === 'Escape') setEditingEntryId(null) }} />
                      <button onClick={() => saveEntryName(e.id, e.source)} className="text-green-600 shrink-0"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingEntryId(null)} className="text-slate-400 shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-600 truncate flex-1">{e.customer_name || e.phone_number}</span>
                      {e.source === 'ticket' && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">biglietto</span>}
                      <span className="font-bold text-cyan-700 shrink-0">#{e.lottery_number}</span>
                      <button onClick={() => startEditEntry(e)} className="text-slate-400 hover:text-cyan-600 shrink-0"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteEntry(e.id, e.source)} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
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
TICKETEOF

mkdir -p "components/shop"
cat > "components/shop/lottery-ticket-card.tsx" << 'TICKETEOF'
"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Gift, Minus, Plus, Ticket, PartyPopper } from 'lucide-react'
import { AmbientBubbles } from './ambient-bubbles'
import { toast } from 'sonner'

interface LotteryData {
  is_active: boolean
  title?: string
  prize_label?: string
  participants_count?: number
}

const STORAGE_KEY = 'mgshop_chat_identity' // stesso usato dalla chat, per precompilare nome/telefono

const TICKET_PRICE = 1

export function LotteryTicketCard() {
  const [data, setData] = useState<LotteryData | null>(null)
  const [qty, setQty] = useState(1)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [numbers, setNumbers] = useState<number[] | null>(null)

  useEffect(() => {
    fetch('/api/lottery', { cache: 'no-store' }).then(r => r.json()).then(d => setData(d)).catch(() => {})
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const id = JSON.parse(raw)
        if (id?.phone) setPhone(id.phone)
        if (id?.name) setName(id.name)
      }
    } catch {}
  }, [])

  if (!data || !data.is_active) return null

  const handleBuy = async () => {
    if (!phone.trim()) { setError('Inserisci il tuo numero di telefono'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/lottery/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, customer_name: name, quantity: qty }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Acquisto non riuscito'); setSubmitting(false); return }
      setNumbers(json.numbers)
      toast.success(`${qty} biglietto${qty > 1 ? 'i' : ''} acquistato${qty > 1 ? 'i' : ''}!`)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name.trim(), phone: phone.trim() }))
      } catch {}
    } catch {
      setError('Acquisto non riuscito, riprova')
    }
    setSubmitting(false)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl neon-glow"
      style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)', border: '1px solid rgba(249,115,22,0.25)' }}>
      <AmbientBubbles count={4} theme="light" />

      <div className="relative z-10 px-5 py-5 sm:px-7 sm:py-6">
        {numbers ? (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <PartyPopper className="w-8 h-8 text-orange-500" />
            <p className="font-bold text-slate-900">Fatto! Il tuo numero{numbers.length > 1 ? 'i' : ''}:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {numbers.map(n => (
                <span key={n} className="px-3 py-1.5 rounded-xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>#{n}</span>
              ))}
            </div>
            <p className="text-xs text-slate-500">Ti aspettiamo all'estrazione — buona fortuna!</p>
            <button onClick={() => { setNumbers(null); setShowForm(false); setQty(1) }}
              className="text-xs text-orange-600 underline underline-offset-2 mt-1">
              Compra altri biglietti
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="shrink-0 animate-float">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 30% 25%, #fde68a, #f59e0b 55%, #c2410c 100%)',
                  boxShadow: 'inset -3px -4px 8px rgba(0,0,0,0.25), inset 3px 4px 7px rgba(255,255,255,0.5), 0 8px 18px rgba(249,115,22,0.35)',
                }}>
                <Gift className="w-6 h-6 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }} />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-wider text-orange-600 uppercase">Lotteria a premi</p>
              <p className="text-base font-bold text-slate-900 mb-1">{data.title || 'Partecipa e vinci'}</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {data.prize_label && <>In palio: <strong className="text-slate-900">{data.prize_label}</strong>. </>}
                Non vuoi comprare nulla ma vuoi comunque tentare la fortuna? Acquista qui i tuoi biglietti, <strong className="text-slate-900">€{TICKET_PRICE} l'uno</strong>.
              </p>

              {!showForm ? (
                <button onClick={() => setShowForm(true)}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl transition-transform hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>
                  <Ticket className="w-4 h-4" /> Compra i biglietti
                </button>
              ) : (
                <div className="mt-3 space-y-2.5 max-w-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-500">Quanti biglietti?</span>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-orange-200 px-1">
                      <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-7 h-7 flex items-center justify-center text-orange-600"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-6 text-center font-bold text-slate-800">{qty}</span>
                      <button onClick={() => setQty(q => Math.min(20, q + 1))} className="w-7 h-7 flex items-center justify-center text-orange-600"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <span className="text-sm font-bold text-orange-600">€{(qty * TICKET_PRICE).toFixed(2)}</span>
                  </div>
                  <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="Il tuo numero di telefono"
                    className="w-full h-10 px-3 rounded-lg text-sm outline-none border border-orange-200 focus:ring-2 focus:ring-orange-300" />
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Il tuo nome (facoltativo)"
                    className="w-full h-10 px-3 rounded-lg text-sm outline-none border border-orange-200 focus:ring-2 focus:ring-orange-300" />
                  {error && <p className="text-red-500 text-xs">{error}</p>}
                  <div className="flex items-center gap-2">
                    <button onClick={handleBuy} disabled={submitting}
                      className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-60 transition-transform hover:scale-[1.02] active:scale-95"
                      style={{ background: 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>
                      {submitting ? 'Acquisto...' : `Prenota ${qty} bigliett${qty > 1 ? 'i' : 'o'} (€${(qty * TICKET_PRICE).toFixed(2)})`}
                    </button>
                    <button onClick={() => setShowForm(false)} className="text-xs text-slate-400 px-2">Annulla</button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Ti ricontatteremo in chat o su WhatsApp per accordarci sul pagamento.
                  </p>
                </div>
              )}

              <Link href="/lotteria" className="block mt-2 text-xs text-orange-500 hover:text-orange-600 underline underline-offset-2">
                Vedi tutti i dettagli della lotteria
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
TICKETEOF

mkdir -p "app/shop"
cat > "app/shop/page.tsx" << 'TICKETEOF'
import { createAdminClient } from '@/lib/supabase/admin'
import { HeroBanner } from '@/components/shop/hero-banner'
import { ProductGrid } from '@/components/shop/product-grid'
import { LoyaltyBanner } from '@/components/shop/loyalty-banner'
import { LotteryTicketCard } from '@/components/shop/lottery-ticket-card'
import type { Product, Category, Banner } from '@/lib/types'

export const revalidate = 0

const PAGE_SIZE = 30

async function getData(searchParams: { q?: string; categoria?: string }) {
  const supabase = createAdminClient()
  const [{ data: banners }, { data: categories }] = await Promise.all([
    supabase.from('banners').select('*').eq('is_active', true).order('display_order'),
    supabase.from('categories').select('*').order('name'),
  ])
  let query = supabase.from('products').select('*, category:categories(*)', { count: 'exact' }).eq('is_active', true).order('created_at', { ascending: false })
  if (searchParams.categoria) {
    const cat = (categories || []).find((c: Category) => c.slug === searchParams.categoria)
    if (cat) query = query.eq('category_id', cat.id)
  }
  if (searchParams.q) query = query.ilike('name', `%${searchParams.q}%`)

  query = query.range(0, PAGE_SIZE - 1)

  const { data: products, count } = await query
  return { banners: banners || [], products: products || [], categories: categories || [], count: count || 0 }
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string }> }) {
  const params = await searchParams
  const { banners, products, categories, count } = await getData(params)

  return (
    <main>
      <HeroBanner banners={banners as Banner[]} categories={categories as Category[]} />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <LotteryTicketCard />
        <LoyaltyBanner />
        {products.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(8,145,178,0.08)' }}>
              <span className="text-2xl">🔍</span>
            </div>
            <p className="text-lg font-medium text-slate-600">Nessun prodotto trovato</p>
          </div>
        ) : (
          <ProductGrid
            initialProducts={products as Product[]}
            count={count}
            q={params.q}
            categoria={params.categoria}
          />
        )}
      </div>
    </main>
  )
}
TICKETEOF

git add app/api/lottery/tickets/route.ts app/api/admin/lottery/entries/route.ts components/admin/lottery-manager.tsx components/shop/lottery-ticket-card.tsx app/shop/page.tsx
git commit -m "feat: acquisto biglietti lotteria multipli senza altri acquisti, card in cima al negozio"
git push
