"use client"
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const HEARTBEAT_INTERVAL = 20000 // 20 secondi

function getSessionId() {
  if (typeof window === 'undefined') return ''
  try {
    let id = sessionStorage.getItem('mgshop-session-id')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('mgshop-session-id', id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pathname, sessionId: getSessionId() }),
    }).catch(() => {})
  }, [pathname])

  useEffect(() => {
    const sessionId = getSessionId()
    const beat = () => {
      fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, page: pathname }),
      }).catch(() => {})
    }
    beat()
    const interval = setInterval(beat, HEARTBEAT_INTERVAL)
    return () => clearInterval(interval)
  }, [pathname])

  return null
}
