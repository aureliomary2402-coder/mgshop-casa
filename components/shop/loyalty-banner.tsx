"use client"

import { useState, useEffect } from 'react'
import { Gift, ChevronRight } from 'lucide-react'

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
  const euroToReward = settings.points_per_euro > 0 ? Math.round(settings.points_threshold / settings.points_per_euro) : 0

  if (compact) return (
    <div className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)' }}>
      <Gift className="w-5 h-5 text-amber-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-800">🎁 Raccolta Punti Fedeltà</p>
        <p className="text-xs text-stone-500 mt-0.5">
          Guadagni <strong>1 punto</strong> ogni <strong>{euroPerPoint}€</strong> spesi.
          A <strong>{settings.points_threshold} punti</strong>: {settings.reward_description}
        </p>
      </div>
    </div>
  )

  const sphereStyle = (size: number) => ({
    width: size, height: size,
    background: 'radial-gradient(circle at 30% 25%, #fde68a, #d97706 55%, #92400e 100%)',
    boxShadow: 'inset -3px -4px 8px rgba(0,0,0,0.3), inset 3px 4px 7px rgba(255,255,255,0.55), 0 6px 14px rgba(217,119,6,0.35)',
  })

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 card-3d"
      style={{ border: '1px solid rgba(217,119,6,0.15)', boxShadow: '0 10px 28px rgba(217,119,6,0.12), 0 2px 6px rgba(0,0,0,0.04)' }}>

      {/* Bollicine che risalgono, contenute nel banner */}
      {[
        { left: '78%', size: 10, dur: 4.5, delay: 0 },
        { left: '85%', size: 6, dur: 3.8, delay: 1 },
        { left: '92%', size: 8, dur: 5, delay: 2 },
        { left: '70%', size: 5, dur: 4, delay: 1.6 },
      ].map((b, i) => (
        <div key={i} className="absolute rounded-full animate-bubble-rise-small"
          style={{
            left: b.left, bottom: 0, width: b.size, height: b.size,
            background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(217,119,6,0.15))',
            border: '1px solid rgba(217,119,6,0.2)',
            animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`,
          }} />
      ))}

      <div className="relative z-10 flex items-center gap-4">
        {/* Icona a bolla 3D */}
        <div className="shrink-0 animate-float">
          <div className="rounded-full flex items-center justify-center" style={sphereStyle(56)}>
            <Gift className="w-6 h-6 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold mb-1.5" style={{ color: '#1a0800' }}>Programma Fedeltà 🎁</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center justify-center rounded-full font-bold text-white text-[11px] shrink-0" style={sphereStyle(22)}>1</span>
            <span className="text-xs text-stone-500">ogni {euroPerPoint}€</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="inline-flex items-center justify-center rounded-full font-bold text-white text-[10px] shrink-0" style={sphereStyle(22)}>{settings.points_threshold}</span>
            <span className="text-xs text-stone-500 truncate">= {settings.reward_description}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
