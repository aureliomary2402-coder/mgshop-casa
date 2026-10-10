"use client"

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { AmbientBubbles } from './ambient-bubbles'

interface LoyaltySettings {
  points_per_euro: number
  points_threshold: number
  reward_description: string
  is_active: boolean
}

export function LoyaltyBanner({ compact = false, strip = false }: { compact?: boolean; strip?: boolean }) {
  const [settings, setSettings] = useState<LoyaltySettings | null>(null)

  useEffect(() => {
    fetch('/api/loyalty-settings').then(r => r.json()).then(d => setSettings(d)).catch(() => {})
  }, [])

  if (!settings || !settings.is_active) return null

  const euroPerPoint = settings.points_per_euro > 0 ? Math.round(1 / settings.points_per_euro) : 0

  // Striscia sottile (shop): una riga chiara, per non occupare spazio prima dei prodotti.
  if (strip) return (
    <div className="mg-glow-card flex items-center gap-3 rounded-2xl border border-cyan-100 bg-gradient-to-br from-white to-cyan-50 px-4 py-3"
      style={{ boxShadow: '0 8px 24px rgba(8,145,178,0.07)' }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-100/70">
        <Sparkles className="h-5 w-5 text-cyan-700" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">Programma fedeltà</p>
        <p className="text-sm font-bold leading-snug text-cyan-950">
          Ogni {euroPerPoint}€ di spesa = 1 punto. A {settings.points_threshold} punti ricevi: {settings.reward_description}
        </p>
      </div>
    </div>
  )

  if (compact) return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
      <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-cyan-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800">Programma Fedeltà</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Ogni {euroPerPoint}€ di spesa = 1 punto. A {settings.points_threshold} punti ricevi: {settings.reward_description}
        </p>
      </div>
    </div>
  )

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[#071a22] neon-glow">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
      <AmbientBubbles count={4} theme="dark" />

      <div className="relative z-10 flex items-center gap-4 px-5 py-5 sm:px-7 sm:py-6">
        <div className="shrink-0 animate-float">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
            <Sparkles className="h-6 w-6 text-cyan-300" />
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Programma fedeltà</p>
          <p className="mb-1.5 mt-0.5 text-base font-black tracking-[-0.02em] text-white">Accumula punti ad ogni ordine</p>
          <p className="text-sm leading-relaxed text-slate-400">
            Ogni <strong className="text-white">{euroPerPoint}€</strong> di spesa ti fa guadagnare{' '}
            <strong className="text-cyan-300">1 punto</strong>. Raggiunti{' '}
            <strong className="text-white">{settings.points_threshold} punti</strong>, ricevi:{' '}
            <strong className="text-white">{settings.reward_description}</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
