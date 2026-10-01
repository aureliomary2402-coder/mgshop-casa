"use client"
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const HEARTBEAT_INTERVAL = 20000

function getSessionId() {
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

function getVisitorId() {
  try {
    const m = document.cookie.match(/(?:^|; )mgshop-vid=([^;]+)/)
    const id = localStorage.getItem('mgshop-visitor-id') || (m ? m[1] : '') || crypto.randomUUID()
    localStorage.setItem('mgshop-visitor-id', id)
    document.cookie = `mgshop-vid=${id}; max-age=31536000; path=/; SameSite=Lax`
    return id
  } catch {
    return ''
  }
}

function getInfo() {
  try {
    return {
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      screen: `${window.screen.width}x${window.screen.height}`,
    }
  } catch {
    return { tz: null, screen: null }
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pathname, sessionId: getSessionId(), visitorId: getVisitorId(), ...getInfo() }),
    }).catch(() => {})
  }, [pathname])

  useEffect(() => {
    const sessionId = getSessionId()
    const visitorId = getVisitorId()
    const beat = () => {
      fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, visitorId, page: pathname }),
      }).catch(() => {})
    }
    beat()
    const interval = setInterval(beat, HEARTBEAT_INTERVAL)
    return () => clearInterval(interval)
  }, [pathname])

  return null
}
