"use client"

import { useState, useEffect } from 'react'
import { Gift, Star, ChevronRight } from 'lucide-react'

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
    <div className="rounded-2xl overflow-hidden bg-white"
      style={{ border: '1px solid rgba(217,119,6,0.15)', boxShadow: '0 8px 32px rgba(217,119,6,0.08)' }}>
      <div className="relative p-5">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle,#d97706,transparent)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
              <Gift className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm" style={{ color: '#1a0800' }}>Programma Fedeltà MGShop</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-2xl font-black text-amber-600">1</p>
              <p className="text-xs text-stone-500">punto ogni</p>
              <p className="text-sm font-bold" style={{ color: '#1a0800' }}>{euroPerPoint}€</p>
            </div>
            <div className="flex items-center justify-center">
              <ChevronRight className="w-5 h-5 text-amber-500/50" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-amber-600">{settings.points_threshold}</p>
              <p className="text-xs text-stone-500">punti =</p>
              <p className="text-sm font-bold" style={{ color: '#1a0800' }}>Premio!</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl"
            style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)' }}>
            <Star className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-stone-600 leading-relaxed">
              <strong className="text-amber-700">Premio:</strong> {settings.reward_description}
            </p>
          </div>
          <p className="text-xs text-stone-400 mt-3 text-center">
            I punti vengono comunicati via WhatsApp dopo ogni ordine
          </p>
        </div>
      </div>
    </div>
  )
}
