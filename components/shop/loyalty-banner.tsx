"use client"

import { useState, useEffect } from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'

interface LoyaltySettings {
  points_per_euro: number
  points_threshold: number
  reward_description: string
  is_active: boolean
}

export function LoyaltyBanner({ compact = false }: { compact?: boolean }) {
  const [settings, setSettings] = useState<LoyaltySettings | null>(null)

  useEffect(() => {
    fetch('/api/loyalty-settings').then(r => r.json()).then(d => setSettings(d)).catch(() => {})
  }, [])

  if (!settings || !settings.is_active) return null

  const euroPerPoint = settings.points_per_euro > 0 ? Math.round(1 / settings.points_per_euro) : 0

  if (compact) return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
      <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-cyan-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800">Programma Fedeltà</p>
        <p className="text-xs text-slate-500 mt-0.5">
          1 punto ogni {euroPerPoint}€ &middot; {settings.points_threshold} punti = {settings.reward_description}
        </p>
      </div>
    </div>
  )

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 px-6 py-6 sm:px-8">

        {/* Etichetta e titolo */}
        <div className="flex items-center gap-4 sm:shrink-0">
          <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-cyan-600 uppercase">Programma fedeltà</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">Accumula punti ad ogni ordine</p>
          </div>
        </div>

        {/* Divisore verticale, solo desktop */}
        <div className="hidden sm:block w-px self-stretch bg-slate-200" />

        {/* Stepper Spendi -> Punti -> Premio */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">{euroPerPoint}€</p>
            <p className="text-[11px] text-slate-500">spesi</p>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 via-cyan-300 to-slate-200 max-w-[40px]" />
          <div className="text-center">
            <p className="text-sm font-bold text-cyan-600">1 punto</p>
            <p className="text-[11px] text-slate-500">accumulato</p>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 via-cyan-300 to-slate-200 max-w-[40px]" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">{settings.points_threshold} pt</p>
            <p className="text-[11px] text-slate-500 truncate max-w-[160px]">{settings.reward_description}</p>
          </div>
        </div>

        <ArrowRight className="hidden sm:block w-4 h-4 text-slate-300 shrink-0" />
      </div>
    </div>
  )
}
