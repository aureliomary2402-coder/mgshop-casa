"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

const DISMISS_KEY = 'mgshop_ticker_dismissed'

// 6 bolle che salgono — pochi elementi, ben visibili
const RISING_BUBBLES = Array.from({ length: 6 }).map((_, i) => ({
  left: `${15 + (i * 14) % 70}%`,
  size: 6 + ((i * 8) % 9),
  dur: 5.5 + ((i * 3) % 5),
  delay: i * 1.8,
}))

// 8 scintillii sulla cresta
const SPARKLES = Array.from({ length: 8 }).map((_, i) => ({
  left: `${12 + (i * 11) % 76}%`,
  size: 2 + ((i * 3) % 3),
  dur: 2 + ((i * 0.9) % 2.5),
  delay: i * 0.7,
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
      {/* Bolle che salgono */}
      <div
        className="fixed left-0 right-0 pointer-events-none overflow-visible"
        style={{ bottom: 24, height: 70, zIndex: 55 }}
      >
        {RISING_BUBBLES.map((b, i) => (
          <div
            key={`bubble-${i}`}
            className="absolute rounded-full foam-bubble"
            style={{
              left: b.left,
              bottom: 0,
              width: b.size,
              height: b.size,
              animationDuration: `${b.dur}s`,
              animationDelay: `${b.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Schiuma 3D */}
      <div
        className="fixed left-0 right-0 pointer-events-none"
        style={{ bottom: 26, height: 36, zIndex: 50 }}
      >
        {/* Ombra proiettata sul ticker */}
        <div className="absolute left-0 right-0 foam-shadow" />

        {/* Layer posteriore — profondità sfocata */}
        <div className="absolute left-0 right-0 foam-layer foam-back" />

        {/* Layer medio — corpo principale */}
        <div className="absolute left-0 right-0 foam-layer foam-mid" />

        {/* Layer frontale — riflessi luminosi */}
        <div className="absolute left-0 right-0 foam-layer foam-front" />

        {/* Cresta ondulata */}
        <div className="absolute left-0 right-0 foam-crest" />

        {/* Scintillii */}
        {SPARKLES.map((s, i) => (
          <span
            key={`sparkle-${i}`}
            className="absolute rounded-full foam-sparkle"
            style={{
              left: s.left,
              bottom: 6 + (i % 3) * 5,
              width: s.size,
              height: s.size,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Ticker */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center h-9 overflow-hidden ticker-bar">
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div className="flex items-center whitespace-nowrap animate-ticker">
            {[...Array(4)].map((_, i) => (
              <span key={i} className="text-white text-xs font-semibold px-10 tracking-wide">
                {message}
              </span>
            ))}
          </div>
          <div className="ticker-shine" />
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Chiudi"
          className="shrink-0 h-full px-3 flex items-center justify-center hover:bg-black/15 transition-colors relative z-10"
        >
          <X className="w-4 h-4 text-white/90" />
        </button>
      </div>

      <style jsx global>{`
        /* ========== TICKER ========== */
        .ticker-bar {
          background: linear-gradient(90deg, #0c4a6e, #075985, #0891b2, #06b6d4, #0891b2, #075985, #0c4a6e);
          background-size: 400% 100%;
          animation: ticker-gradient 12s ease infinite;
          box-shadow:
            0 -1px 0 rgba(255,255,255,0.15) inset,
            0 -3px 12px rgba(8,145,178,0.25);
        }
        @keyframes ticker-gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-ticker {
          animation: ticker-scroll 24s linear infinite;
        }
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-25%); }
        }

        .ticker-shine {
          position: absolute;
          top: 0;
          left: -20%;
          width: 20%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: shine-sweep 6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes shine-sweep {
          0% { left: -20%; }
          35% { left: 120%; }
          100% { left: 120%; }
        }

        /* ========== SCHIUMA 3D ========== */

        /* Ombra che la schiuma proietta sul ticker */
        .foam-shadow {
          bottom: -10px;
          height: 14px;
          background: linear-gradient(to top, rgba(8,145,178,0.2), transparent);
          filter: blur(4px);
          opacity: 0.6;
        }

        .foam-layer {
          bottom: 0;
          height: 28px;
          background-repeat: repeat-x;
          background-position: bottom center;
        }

        /* Layer posteriore: scuro, sfocato, dà profondità */
        .foam-back {
          bottom: -4px;
          opacity: 0.35;
          filter: blur(3px);
          transform: scaleY(0.95);
          background-image: radial-gradient(
            circle at 35% 30%,
            rgba(8,145,178,0.5) 0%,
            rgba(8,145,178,0.2) 40%,
            transparent 80%
          );
          background-size: 44px 24px;
          animation: foam-drift-back 15s linear infinite;
        }

        /* Layer medio: il corpo principale della schiuma */
        .foam-mid {
          bottom: -1px;
          opacity: 0.85;
          filter: blur(0.8px);
          background-image: radial-gradient(
            circle at 30% 26%,
            #ffffff 0%,
            #ffffff 11%,
            rgba(224,247,250,0.92) 28%,
            rgba(103,212,231,0.45) 56%,
            rgba(8,145,178,0.18) 80%,
            transparent 100%
          );
          background-size: 34px 26px;
          animation: foam-drift-mid 10s linear infinite reverse;
        }

        /* Layer frontale: luci e riflessi in primo piano */
        .foam-front {
          bottom: 1px;
          opacity: 0.7;
          background-image: radial-gradient(
            circle at 28% 24%,
            rgba(255,255,255,0.98) 0%,
            rgba(255,255,255,0.7) 14%,
            rgba(200,245,255,0.4) 42%,
            rgba(8,145,178,0.1) 75%,
            transparent 100%
          );
          background-size: 28px 26px;
          animation: foam-drift-front 7s linear infinite;
        }

        /* Cresta ondulata — effetto 3D sulla sommità */
        .foam-crest {
          bottom: 18px;
          height: 16px;
          background: linear-gradient(
            to top,
            rgba(255,255,255,0.85) 0%,
            rgba(255,255,255,0.3) 50%,
            transparent 100%
          );
          border-radius: 50% 50% 0 0 / 100% 100% 0 0;
          opacity: 0.8;
          filter: blur(0.4px);
          animation: crest-morph 5s ease-in-out infinite;
        }
        /* Micro-bolle sulla cresta */
        .foam-crest::after {
          content: '';
          position: absolute;
          left: -10%;
          right: -10%;
          top: -2px;
          height: 12px;
          background-image: radial-gradient(
            circle at 40% 60%,
            rgba(255,255,255,0.9) 0%,
            rgba(255,255,255,0.5) 40%,
            transparent 70%
          );
          background-size: 22px 12px;
          background-repeat: repeat-x;
          animation: crest-bubbles 4s ease-in-out infinite;
          opacity: 0.7;
        }

        /* Scintillii */
        .foam-sparkle {
          background: radial-gradient(circle, #ffffff 0%, rgba(180,240,255,0.8) 100%);
          box-shadow: 0 0 3px rgba(255,255,255,0.9), 0 0 6px rgba(150,235,250,0.5);
          animation: sparkle-twinkle ease-in-out infinite;
        }

        /* Bolle che salgono */
        .foam-bubble {
          background: radial-gradient(
            circle at 28% 26%,
            rgba(255,255,255,0.9) 0%,
            rgba(255,255,255,0.55) 35%,
            rgba(8,145,178,0.2) 68%,
            transparent 100%
          );
          box-shadow:
            inset -1px -1px 2px rgba(8,145,178,0.12),
            inset 1px 1px 2px rgba(255,255,255,0.7),
            0 0 2px rgba(255,255,255,0.25);
          border: 1px solid rgba(255,255,255,0.3);
          animation-name: bubble-rise;
          animation-timing-function: ease-out;
          animation-iteration-count: infinite;
        }

        /* ========== KEYFRAMES ========== */
        @keyframes foam-drift-back {
          from { background-position-x: 0; }
          to { background-position-x: -88px; }
        }
        @keyframes foam-drift-mid {
          from { background-position-x: 0; }
          to { background-position-x: -68px; }
        }
        @keyframes foam-drift-front {
          from { background-position-x: 0; }
          to { background-position-x: 56px; }
        }
        @keyframes crest-morph {
          0%, 100% {
            transform: scaleY(1) scaleX(1);
            border-radius: 50% 50% 0 0 / 100% 100% 0 0;
          }
          33% {
            transform: scaleY(1.2) scaleX(1.02);
            border-radius: 48% 52% 0 0 / 90% 110% 0 0;
          }
          66% {
            transform: scaleY(0.9) scaleX(0.98);
            border-radius: 52% 48% 0 0 / 110% 90% 0 0;
          }
        }
        @keyframes crest-bubbles {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-12px); }
        }
        @keyframes sparkle-twinkle {
          0%, 100% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes bubble-rise {
          0% {
            transform: translateY(0) scale(0.3);
            opacity: 0;
          }
          10% { opacity: 0.9; }
          50% {
            transform: translateY(-28px) scale(1);
            opacity: 0.7;
          }
          85% {
            transform: translateY(-48px) scale(1.2);
            opacity: 0.2;
          }
          100% {
            transform: translateY(-58px) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}
