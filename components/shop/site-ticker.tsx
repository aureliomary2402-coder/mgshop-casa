"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

const DISMISS_KEY = 'mgshop_ticker_dismissed'

export function SiteTicker() {
  const pathname = usePathname()
  const [message, setMessage] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/ticker')
      .then(r => r.json())
      .then(d => {
        setMessage(d.message || '')
        setIsActive(d.is_active === true)
      })
      .catch(() => {})
    // Nasconde di nuovo solo per questa "sessione" di navigazione (tab aperta),
    // così chi lo chiude non lo rivede continuando a girare per il sito,
    // ma tornando in un secondo momento lo trova di nuovo.
    if (typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true)
    }
  }, [])

  if (pathname?.startsWith('/mgadmin-panel')) return null
  if (!isActive || !message.trim() || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center h-8 overflow-hidden shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
      style={{ background: 'linear-gradient(90deg,#0891b2,#0e7490)' }}>
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div className="flex items-center whitespace-nowrap animate-site-ticker">
          <span className="text-white text-xs font-medium px-6">{message}</span>
          <span className="text-white text-xs font-medium px-6">{message}</span>
          <span className="text-white text-xs font-medium px-6">{message}</span>
        </div>
      </div>
      <button onClick={handleDismiss} aria-label="Chiudi" className="shrink-0 h-full px-2.5 flex items-center justify-center hover:bg-black/10 transition-colors">
        <X className="w-3.5 h-3.5 text-white/80" />
      </button>
      <style jsx>{`
        @keyframes site-ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        .animate-site-ticker {
          animation: site-ticker-scroll 18s linear infinite;
        }
      `}</style>
    </div>
  )
}
