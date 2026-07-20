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
          Ogni {euroPerPoint}€ di spesa = 1 punto. A {settings.points_threshold} punti ricevi: {settings.reward_description}
        </p>
      </div>
    </div>
  )

  return (
    <div className="relative overflow-hidden rounded-2xl neon-glow"
      style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fbfd 100%)', border: '1px solid rgba(8,145,178,0.15)' }}>

      <AmbientBubbles count={4} theme="light" />

      <div className="relative z-10 flex items-center gap-4 px-5 py-5 sm:px-7 sm:py-6">
        <div className="shrink-0 animate-float">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 30% 25%, #a5f3fc, #0891b2 55%, #155e75 100%)',
              boxShadow: 'inset -3px -4px 8px rgba(0,0,0,0.25), inset 3px 4px 7px rgba(255,255,255,0.5), 0 8px 18px rgba(8,145,178,0.35)',
            }}>
            <Sparkles className="w-6 h-6 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }} />
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider text-cyan-600 uppercase">Programma fedeltà</p>
          <p className="text-base font-bold text-slate-900 mb-1.5">Accumula punti ad ogni ordine</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Ogni <strong className="text-slate-900">{euroPerPoint}€</strong> di spesa ti fa guadagnare{' '}
            <strong className="text-cyan-600">1 punto</strong>. Raggiunti{' '}
            <strong className="text-slate-900">{settings.points_threshold} punti</strong>, ricevi:{' '}
            <strong className="text-slate-900">{settings.reward_description}</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}
