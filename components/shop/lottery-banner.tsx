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
    <Link href="/lotteria" className="group relative block overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[#071a22] neon-glow transition-transform hover:-translate-y-0.5">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
      <AmbientBubbles count={4} theme="dark" />

      <div className="relative z-10 flex items-center gap-4 px-5 py-5 sm:px-7 sm:py-6">
        <div className="shrink-0 animate-float">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
            <Gift className="h-6 w-6 text-cyan-300" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Lotteria a premi</p>
          <p className="mb-1.5 mt-0.5 text-base font-black tracking-[-0.02em] text-white">{data.title || 'Partecipa e vinci'}</p>
          <p className="text-sm leading-relaxed text-slate-400">
            {data.prize_label && <>In palio: <strong className="text-white">{data.prize_label}</strong>. </>}
            Aggiungi <strong className="text-white">1€</strong> al checkout e ricevi il tuo numero.
            {typeof data.participants_count === 'number' && (
              <> Bolle in gioco: <strong className="text-white">{data.participants_count}</strong>.</>
            )}
          </p>
        </div>

        <ArrowRight className="hidden h-5 w-5 shrink-0 text-cyan-300 transition-transform group-hover:translate-x-1 sm:block" />
      </div>
    </Link>
  )
}
