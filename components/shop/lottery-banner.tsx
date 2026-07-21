"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Gift, ArrowRight } from 'lucide-react'
import { AmbientBubbles } from './ambient-bubbles'

interface LotteryData {
  is_active: boolean
  title?: string
  prize_label?: string
  participants_count?: number
  ends_at?: string | null
}

export function LotteryBanner() {
  const [data, setData] = useState<LotteryData | null>(null)

  useEffect(() => {
    fetch('/api/lottery', { cache: 'no-store' }).then(r => r.json()).then(d => setData(d)).catch(() => {})
  }, [])

  if (!data || !data.is_active) return null

  return (
    <Link href="/lotteria" className="block relative overflow-hidden rounded-2xl neon-glow transition-transform hover:scale-[1.01]"
      style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)', border: '1px solid rgba(249,115,22,0.2)' }}>

      <AmbientBubbles count={4} theme="light" />

      <div className="relative z-10 flex items-center gap-4 px-5 py-5 sm:px-7 sm:py-6">
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
          <p className="text-base font-bold text-slate-900 mb-1.5">{data.title || 'Partecipa e vinci'}</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {data.prize_label && <>In palio: <strong className="text-slate-900">{data.prize_label}</strong>. </>}
            Aggiungi <strong className="text-slate-900">1€</strong> al checkout e ricevi il tuo numero.
            {typeof data.participants_count === 'number' && (
              <> Bolle in gioco: <strong className="text-slate-900">{data.participants_count}</strong>.</>
            )}
          </p>
        </div>

        <ArrowRight className="w-5 h-5 text-orange-500 shrink-0 hidden sm:block" />
      </div>
    </Link>
  )
}
