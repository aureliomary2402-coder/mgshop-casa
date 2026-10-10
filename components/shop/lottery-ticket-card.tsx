"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Gift, Minus, Plus, Ticket, ShoppingCart } from 'lucide-react'
import { AmbientBubbles } from './ambient-bubbles'
import { useCartStore } from '@/lib/cart-store'
import { createLotteryTicketProduct, LOTTERY_TICKET_PRODUCT_ID } from '@/lib/lottery-ticket-product'
import { toast } from 'sonner'

interface LotteryData {
  is_active: boolean
  title?: string
  prize_label?: string
  ticket_price?: number
}

export function LotteryTicketCard({ hideDetailsLink = false, strip = false }: { hideDetailsLink?: boolean; strip?: boolean } = {}) {
  const [data, setData] = useState<LotteryData | null>(null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const items = useCartStore(s => s.items)
  const addItem = useCartStore(s => s.addItem)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const removeItem = useCartStore(s => s.removeItem)

  useEffect(() => {
    fetch('/api/lottery', { cache: 'no-store' }).then(r => r.json()).then(d => setData(d)).catch(() => {})
  }, [])

  const ticketPrice = data?.ticket_price ?? 1
  const cartTicket = items.find(i => i.product.id === LOTTERY_TICKET_PRODUCT_ID)

  // Se l'admin ha cambiato il prezzo dopo che il cliente aveva già messo
  // biglietti nel carrello (magari in una visita precedente, dato che il
  // carrello resta salvato nel browser), aggiorniamo il prezzo dell'articolo
  // già presente invece di lasciarlo al vecchio importo.
  useEffect(() => {
    if (data && cartTicket && cartTicket.product.price !== ticketPrice) {
      const qtyInCart = cartTicket.quantity
      removeItem(LOTTERY_TICKET_PRODUCT_ID)
      addItem(createLotteryTicketProduct(ticketPrice))
      if (qtyInCart > 1) updateQuantity(LOTTERY_TICKET_PRODUCT_ID, qtyInCart)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, ticketPrice])

  if (!data || !data.is_active) return null

  const inCart = cartTicket?.quantity || 0

  const handleAdd = () => {
    const ticket = createLotteryTicketProduct(ticketPrice)
    const existing = items.find(i => i.product.id === LOTTERY_TICKET_PRODUCT_ID)
    if (existing) {
      updateQuantity(LOTTERY_TICKET_PRODUCT_ID, existing.quantity + qty)
    } else {
      addItem(ticket)
      if (qty > 1) updateQuantity(LOTTERY_TICKET_PRODUCT_ID, qty)
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
    toast.success(`${qty} bigliett${qty > 1 ? 'i' : 'o'} aggiunt${qty > 1 ? 'i' : 'o'} al carrello!`)
    setQty(1)
  }

  // Striscia sottile (shop): una riga chiara con il tasto per prendere subito un biglietto.
  if (strip) return (
    <div className="mg-glow-card flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-100 bg-gradient-to-br from-white to-cyan-50 px-4 py-3"
      style={{ boxShadow: '0 8px 24px rgba(8,145,178,0.07)' }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-100/70">
        <Gift className="h-5 w-5 text-cyan-700" />
      </div>
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">Lotteria a premi</p>
        <p className="text-sm font-bold leading-snug text-cyan-950">
          {data.title || 'Partecipa e vinci'}
          {data.prize_label && <span className="font-medium text-slate-600"> · In palio: {data.prize_label}</span>}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/lotteria" className="text-xs font-bold text-cyan-700 underline underline-offset-2 hover:text-cyan-900">Dettagli</Link>
        <button onClick={handleAdd}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-black transition-all active:scale-[0.97]"
          style={added
            ? { background: '#4ade80', color: '#052e16' }
            : { background: '#22d3ee', color: '#05212a', boxShadow: '0 8px 20px rgba(34,211,238,.28)' }}>
          {added ? <><Ticket className="h-3.5 w-3.5" /> Aggiunto!</> : <><ShoppingCart className="h-3.5 w-3.5" /> Biglietto €{ticketPrice.toFixed(2)}</>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-cyan-300/15 bg-[#071a22] neon-glow">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
      <AmbientBubbles count={4} theme="dark" />

      <div className="relative z-10 flex flex-col items-start gap-5 px-5 py-6 sm:flex-row sm:items-center sm:px-8 sm:py-8">
        <div className="shrink-0 animate-float">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
            <Gift className="h-7 w-7 text-cyan-300" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Lotteria a premi</p>
          <p className="mb-1 mt-1 text-xl font-black tracking-[-0.02em] text-white">{data.title || 'Partecipa e vinci'}</p>
          <p className="text-sm leading-relaxed text-slate-400">
            {data.prize_label && <>In palio: <strong className="text-white">{data.prize_label}</strong>. </>}
            Non vuoi comprare nulla ma vuoi comunque tentare la fortuna? Aggiungi un biglietto al carrello, <strong className="text-white">€{ticketPrice.toFixed(2)} l'uno</strong> — puoi prenderne quanti vuoi.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-2xl border border-white/15 bg-white/10 px-1">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="flex h-10 w-10 items-center justify-center text-cyan-200"><Minus className="h-4 w-4" /></button>
              <span className="w-7 text-center font-black text-white">{qty}</span>
              <button onClick={() => setQty(q => Math.min(20, q + 1))} className="flex h-10 w-10 items-center justify-center text-cyan-200"><Plus className="h-4 w-4" /></button>
            </div>

            <button onClick={handleAdd}
              className="inline-flex h-12 items-center gap-2 rounded-2xl px-6 text-sm font-black transition-all active:scale-[0.98]"
              style={added
                ? { background: '#4ade80', color: '#052e16' }
                : { background: '#22d3ee', color: '#05212a', boxShadow: '0 12px 32px rgba(34,211,238,.30)' }}>
              {added ? <><Ticket className="h-4 w-4" /> Aggiunto!</> : <><ShoppingCart className="h-4 w-4" /> Aggiungi al carrello (€{(qty * ticketPrice).toFixed(2)})</>}
            </button>

            {inCart > 0 && (
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200">
                {inCart} nel carrello
              </span>
            )}
          </div>

          {!hideDetailsLink && (
            <Link href="/lotteria" className="mt-3 block text-xs text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
              Vedi tutti i dettagli della lotteria
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
