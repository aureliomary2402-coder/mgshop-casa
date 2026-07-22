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
}

const TICKET_PRICE = 1

export function LotteryTicketCard() {
  const [data, setData] = useState<LotteryData | null>(null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const items = useCartStore(s => s.items)
  const addItem = useCartStore(s => s.addItem)
  const updateQuantity = useCartStore(s => s.updateQuantity)

  useEffect(() => {
    fetch('/api/lottery', { cache: 'no-store' }).then(r => r.json()).then(d => setData(d)).catch(() => {})
  }, [])

  if (!data || !data.is_active) return null

  const inCart = items.find(i => i.product.id === LOTTERY_TICKET_PRODUCT_ID)?.quantity || 0

  const handleAdd = () => {
    const ticket = createLotteryTicketProduct(TICKET_PRICE)
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

  return (
    <div className="relative overflow-hidden rounded-2xl neon-glow"
      style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)', border: '1px solid rgba(249,115,22,0.25)' }}>
      <AmbientBubbles count={4} theme="light" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 px-5 py-5 sm:px-7 sm:py-6">
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
            Non vuoi comprare nulla ma vuoi comunque tentare la fortuna? Aggiungi un biglietto al carrello, <strong className="text-slate-900">€{TICKET_PRICE} l'uno</strong> — puoi prenderne quanti vuoi.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-orange-200 px-1">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-orange-600"><Minus className="w-3.5 h-3.5" /></button>
              <span className="w-6 text-center font-bold text-slate-800">{qty}</span>
              <button onClick={() => setQty(q => Math.min(20, q + 1))} className="w-8 h-8 flex items-center justify-center text-orange-600"><Plus className="w-3.5 h-3.5" /></button>
            </div>

            <button onClick={handleAdd}
              className="inline-flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl transition-transform hover:scale-105 active:scale-95"
              style={{ background: added ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#f59e0b,#ea580c)' }}>
              {added ? <><Ticket className="w-4 h-4" /> Aggiunto!</> : <><ShoppingCart className="w-4 h-4" /> Aggiungi al carrello (€{(qty * TICKET_PRICE).toFixed(2)})</>}
            </button>

            {inCart > 0 && (
              <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                {inCart} nel carrello
              </span>
            )}
          </div>

          <Link href="/lotteria" className="block mt-2.5 text-xs text-orange-500 hover:text-orange-600 underline underline-offset-2">
            Vedi tutti i dettagli della lotteria
          </Link>
        </div>
      </div>
    </div>
  )
}
