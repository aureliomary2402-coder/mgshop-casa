"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

const DISMISS_KEY = 'mgshop_ticker_dismissed'

const TICKER_BUBBLES = Array.from({ length: 10 }).map((_, i) => ({
  left: `${(i * 97) % 100}%`,
  size: 4 + ((i * 13) % 8),
  dur: 4 + ((i * 11) % 4),
  delay: (i * 1.4) % 6,
}))

// Scintillii sparsi lungo la cresta di schiuma (posizioni in %, va bene:
// sono solo accenti sparkle sopra al pattern di schiuma che invece
// si ripete a piastrelle su tutta la larghezza, senza buchi)
const FOAM_SPARKLES = Array.from({ length: 14 }).map((_, i) => ({
  left: `${(i * 7.3 + (i % 3) * 11) % 100}%`,
  size: 3 + ((i * 5) % 4),
  bottom: -2 + ((i * 7) % 14),
  dur: 1.8 + ((i * 0.6) % 2.2),
  delay: (i * 0.35) % 3,
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
    <div className="fixed left-0 right-0 h-14 overflow-visible pointer-events-none" style={{ bottom: 24, zIndex: 60 }}>
      {TICKER_BUBBLES.map((b, i) => (
        <div key={i} className="absolute rounded-full site-ticker-bubble"
          style={{
            left: b.left, bottom: 0, width: b.size, height: b.size,
            animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`,
          }} />
      ))}
    </div>
    <div className="fixed left-0 right-0 pointer-events-none site-ticker-foam-wrap" style={{ bottom: 32, zIndex: 50 }}>
      <div className="site-ticker-foam site-ticker-foam-back" />
      <div className="site-ticker-foam site-ticker-foam-front" />
      {FOAM_SPARKLES.map((s, i) => (
        <span key={i} className="absolute rounded-full site-ticker-foam-sparkle"
          style={{
            left: s.left, bottom: s.bottom, width: s.size, height: s.size,
            animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s`,
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
      <style jsx global>{`
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
        .site-ticker-foam-wrap {
          height: 0;
        }
        .site-ticker-foam {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -7px;
          height: 26px;
          background-repeat: repeat-x;
          background-position: bottom;
          filter: drop-shadow(0 1px 1px rgba(8,145,178,0.25));
        }
        .site-ticker-foam-back {
          background-image:
            radial-gradient(circle at 9px 20px, rgba(255,255,255,0.9) 0 5px, transparent 6px),
            radial-gradient(circle at 22px 22px, rgba(224,247,250,0.85) 0 7px, transparent 8px),
            radial-gradient(circle at 38px 19px, rgba(255,255,255,0.9) 0 5px, transparent 6px),
            radial-gradient(circle at 52px 22px, rgba(224,247,250,0.85) 0 6px, transparent 7px),
            radial-gradient(circle at 66px 20px, rgba(255,255,255,0.9) 0 5px, transparent 6px);
          background-size: 76px 26px;
          opacity: 0.7;
          animation: site-ticker-foam-drift-back 10s linear infinite,
                     site-ticker-foam-bob 3.4s ease-in-out infinite;
        }
        .site-ticker-foam-front {
          background-image:
            radial-gradient(circle at 6px 22px, rgba(255,255,255,0.98) 0 7px, transparent 8px),
            radial-gradient(circle at 20px 24px, rgba(255,255,255,0.95) 0 9px, transparent 10px),
            radial-gradient(circle at 36px 21px, rgba(240,253,255,0.95) 0 6px, transparent 7px),
            radial-gradient(circle at 49px 24px, rgba(255,255,255,0.98) 0 8px, transparent 9px);
          background-size: 58px 26px;
          animation: site-ticker-foam-drift-front 6.5s linear infinite reverse,
                     site-ticker-foam-bob 2.5s ease-in-out infinite 0.3s;
        }
        @keyframes site-ticker-foam-drift-back {
          from { background-position-x: 0; }
          to { background-position-x: -76px; }
        }
        @keyframes site-ticker-foam-drift-front {
          from { background-position-x: 0; }
          to { background-position-x: 58px; }
        }
        @keyframes site-ticker-foam-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .site-ticker-foam-sparkle {
          background: #fff;
          box-shadow: 0 0 4px rgba(255,255,255,0.9), 0 0 8px rgba(150,235,250,0.6);
          animation-name: site-ticker-foam-sparkle-twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes site-ticker-foam-sparkle-twinkle {
          0%, 100% { opacity: 0; transform: scale(0.4); }
          50% { opacity: 1; transform: scale(1); }
        }
        .site-ticker-bubble {
          background: radial-gradient(circle at 32% 28%, rgba(255,255,255,0.75), rgba(8,145,178,0.12) 60%, transparent 100%);
          box-shadow: inset -1px -1px 3px rgba(255,255,255,0.3), inset 1px 1px 2px rgba(8,145,178,0.1);
          border: 1px solid rgba(255,255,255,0.25);
          animation-name: site-ticker-bubble-rise;
          animation-timing-function: ease-out;
          animation-iteration-count: infinite;
        }
        @keyframes site-ticker-bubble-rise {
          0% { transform: translateY(0) scale(0.4); opacity: 0; }
          10% { opacity: 0.75; }
          65% { transform: translateY(-30px) scale(0.9); opacity: 0.6; }
          88% { transform: translateY(-42px) scale(1.1); opacity: 0.25; }
          100% { transform: translateY(-48px) scale(1.3); opacity: 0; }
        }
        .site-ticker-bubble {
          animation-name: site-ticker-bubble-rise;
          animation-timing-function: ease-out;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
    </>
  )
}
