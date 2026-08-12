"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

const DISMISS_KEY = 'mgshop_ticker_dismissed'

const TICKER_BUBBLES = Array.from({ length: 18 }).map((_, i) => ({
  left: `${(i * 61) % 100}%`,
  size: 6 + ((i * 23) % 16),
  dur: 3.5 + ((i * 11) % 4),
  delay: (i * 0.9) % 5,
}))

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
    <>
    <div className="fixed bottom-8 left-0 right-0 z-40 h-14 overflow-hidden pointer-events-none">
      {TICKER_BUBBLES.map((b, i) => (
        <div key={i} className="absolute rounded-full site-ticker-bubble"
          style={{
            left: b.left, bottom: 0, width: b.size, height: b.size,
            animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`,
          }} />
      ))}
    </div>
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center h-8 overflow-hidden shadow-[0_-2px_8px_rgba(0,0,0,0.06)] site-ticker-bg">
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div className="flex items-center whitespace-nowrap animate-site-ticker">
          <span className="text-white text-xs font-semibold px-6">{message}</span>
          <span className="text-white text-xs font-semibold px-6">{message}</span>
          <span className="text-white text-xs font-semibold px-6">{message}</span>
        </div>
        <div className="site-ticker-shine" />
      </div>
      <button onClick={handleDismiss} aria-label="Chiudi" className="shrink-0 h-full px-2.5 flex items-center justify-center hover:bg-black/10 transition-colors relative z-10">
        <X className="w-3.5 h-3.5 text-white/80" />
      </button>
      <style jsx>{`
        .site-ticker-bg {
          background: linear-gradient(270deg, #0891b2, #0e7490, #06b6d4, #0891b2);
          background-size: 300% 100%;
          animation: site-ticker-gradient 10s ease infinite;
        }
        @keyframes site-ticker-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes site-ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        .animate-site-ticker {
          animation: site-ticker-scroll 18s linear infinite;
        }
        .site-ticker-shine {
          position: absolute;
          top: 0;
          left: -30%;
          width: 30%;
          height: 100%;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%);
          animation: site-ticker-shine-sweep 5s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes site-ticker-shine-sweep {
          0% { left: -30%; }
          35% { left: 130%; }
          100% { left: 130%; }
        }
        .site-ticker-bubble {
          background: radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9), rgba(8,145,178,0.2) 55%, transparent 100%);
          box-shadow: inset -2px -2px 5px rgba(255,255,255,0.4), inset 2px 2px 4px rgba(8,145,178,0.15), 0 0 6px rgba(150,235,250,0.15);
          border: 1px solid rgba(255,255,255,0.35);
          animation-name: site-ticker-bubble-rise;
          animation-timing-function: ease-out;
          animation-iteration-count: infinite;
        }
        @keyframes site-ticker-bubble-rise {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          12% { opacity: 0.9; }
          70% { transform: translateY(-38px) scale(1); opacity: 0.85; }
          88% { transform: translateY(-48px) scale(1.35); opacity: 0.35; }
          100% { transform: translateY(-52px) scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
    </>
  )
}
