"use client"
import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { subscribeToPush } from '@/lib/push-subscribe'

export function NotifyBanner() {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
    if (Notification.permission !== 'default') return
    if (localStorage.getItem('mgshop-notify-dismissed')) return

    navigator.serviceWorker.ready.then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      if (!sub) setVisible(true)
    }).catch(() => {})
  }, [])

  const dismiss = () => {
    localStorage.setItem('mgshop-notify-dismissed', '1')
    setVisible(false)
  }

  const activate = async () => {
    setLoading(true)
    const result = await subscribeToPush()
    setLoading(false)
    if (result.ok) {
      setVisible(false)
    } else {
      // Permesso negato o non disponibile: non insistiamo più
      localStorage.setItem('mgshop-notify-dismissed', '1')
      setVisible(false)
    }
  }

  if (!visible) return null

  return (
    <div className="fixed left-4 right-4 z-40 animate-slide-in-up" style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="max-w-sm mx-auto flex items-center gap-3 p-3.5 rounded-2xl shadow-lg" style={{ background: 'white', border: '1px solid rgba(8,145,178,0.15)' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(8,145,178,0.1)' }}>
          <Bell className="w-5 h-5" style={{ color: '#0891b2' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: '#0c2b36' }}>Non perderti le offerte!</p>
          <p className="text-xs text-slate-500">Attiva le notifiche per promozioni e novità.</p>
        </div>
        <button onClick={activate} disabled={loading}
          className="shrink-0 text-xs font-bold text-white px-3 py-2 rounded-xl transition-transform active:scale-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
          {loading ? '...' : 'Attiva'}
        </button>
        <button onClick={dismiss} className="shrink-0 p-1 text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
