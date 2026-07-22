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
