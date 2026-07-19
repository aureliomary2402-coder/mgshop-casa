"use client"

import { useState, useEffect } from 'react'
import { Gift } from 'lucide-react'

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

  return (
    <div className="relative flex items-center gap-3 p-3 rounded-2xl bg-white overflow-hidden"
      style={{ border: '1px solid rgba(217,119,6,0.15)', boxShadow: '0 4px 16px rgba(217,119,6,0.08)' }}>
      {/* Bollicine decorative */}
      <div className="absolute top-1.5 right-8 w-3 h-3 rounded-full animate-bubble-bob"
        style={{ background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(217,119,6,0.2))', border: '1px solid rgba(217,119,6,0.2)' }} />
      <div className="absolute bottom-2 right-3 w-2 h-2 rounded-full animate-bubble-bob"
        style={{ background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(217,119,6,0.2))', border: '1px solid rgba(217,119,6,0.2)', animationDelay: '1.2s' }} />
      <div className="absolute top-3 right-1 w-1.5 h-1.5 rounded-full animate-bubble-bob"
        style={{ background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(217,119,6,0.2))', border: '1px solid rgba(217,119,6,0.2)', animationDelay: '2.1s' }} />

      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
        <Gift className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-bold" style={{ color: '#1a0800' }}>
          🎁 Punti fedeltà: 1 ogni {euroPerPoint}€
        </p>
        <p className="text-xs text-stone-500 truncate">
          {settings.points_threshold} punti → {settings.reward_description}
        </p>
      </div>
    </div>
  )
}
