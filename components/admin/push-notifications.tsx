"use client"

import { useState, useEffect } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'

export function PushNotifications() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('loading')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    navigator.serviceWorker.ready.then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      if (sub) setStatus('subscribed')
      else if (Notification.permission === 'denied') setStatus('denied')
      else setStatus('unsubscribed')
    })
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }
  }, [])

  const subscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      })
      setStatus('subscribed')
    } catch (err) {
      console.error(err)
      if (Notification.permission === 'denied') setStatus('denied')
    }
    setLoading(false)
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint })
        })
        await sub.unsubscribe()
      }
      setStatus('unsubscribed')
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  if (status === 'loading') return null
  if (status === 'unsupported') return (
    <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
      <BellOff className="w-3.5 h-3.5" /> Notifiche non supportate
    </div>
  )

  return (
    <div>
      {status === 'subscribed' ? (
        <button onClick={unsubscribe} disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}>
          <Check className="w-3.5 h-3.5" />
          {loading ? '...' : 'Notifiche attive'}
        </button>
      ) : status === 'denied' ? (
        <div className="flex items-center gap-1.5 text-xs text-red-500 px-2">
          <BellOff className="w-3.5 h-3.5" /> Notifiche bloccate
        </div>
      ) : (
        <button onClick={subscribe} disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:scale-105 btn-press"
          style={{ background: 'rgba(8,145,178,0.1)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.2)' }}>
          <Bell className="w-3.5 h-3.5" />
          {loading ? 'Attivazione...' : 'Attiva notifiche'}
        </button>
      )}
    </div>
  )
}
