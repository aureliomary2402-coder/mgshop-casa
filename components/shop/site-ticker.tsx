"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

const DISMISS_KEY = 'mgshop_ticker_dismissed'

interface Bubble {
  id: number
  x: number
  y: number
  size: number
  dur: number
  delay: number
  born: number
}

const cssAnimations = `
  @keyframes ticker-gradient {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  @keyframes ticker-scroll {
    from { transform: translateX(0); }
    to { transform: translateX(-25%); }
  }
  @keyframes shine-sweep {
    0% { left: -20%; }
    35% { left: 120%; }
    100% { left: 120%; }
  }
  @keyframes bubble-wobble {
    0%, 100% { transform: scale(1, 1); }
    25% { transform: scale(1.06, 0.94); }
    50% { transform: scale(0.94, 1.06); }
    75% { transform: scale(1.03, 0.97); }
  }
`

export function SiteTicker() {
  const pathname = usePathname()
  const [message, setMessage] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const idRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const spawnBubble = useCallback(() => {
    const w = containerRef.current?.offsetWidth || 1200
    const size = 8 + Math.random() * 22
    const bubble: Bubble = {
      id: idRef.current++,
      x: Math.random() * w,
      y: 10 + Math.random() * 50,
      size,
      dur: 3.5 + Math.random() * 4.5,
      delay: Math.random() * 1.5,
      born: Date.now(),
    }
    setBubbles(prev => {
      const now = Date.now()
      const alive = prev.filter(b => now - b.born < (b.dur + b.delay) * 1000)
      return [...alive, bubble].slice(-40)
    })
  }, [])

  useEffect(() => {
    if (!isActive || dismissed) return
    const initial: Bubble[] = []
    for (let i = 0; i < 18; i++) {
      const w = containerRef.current?.offsetWidth || 1200
      const size = 8 + Math.random() * 22
      initial.push({
        id: idRef.current++,
        x: Math.random() * w,
        y: 10 + Math.random() * 50,
        size,
        dur: 3.5 + Math.random() * 4.5,
        delay: Math.random() * 2,
        born: Date.now() - Math.random() * 3000,
      })
    }
    setBubbles(initial)
    const interval = setInterval(spawnBubble, 250 + Math.random() * 350)
    return () => clearInterval(interval)
  }, [isActive, dismissed, spawnBubble])

  useEffect(() => {
    if (!isActive || dismissed) return
    const cleanup = setInterval(() => {
      const now = Date.now()
      setBubbles(prev => prev.filter(b => now - b.born < (b.dur + b.delay) * 1000 + 500))
    }, 1000)
    return () => clearInterval(cleanup)
  }, [isActive, dismissed])

  if (pathname?.startsWith('/mgadmin-panel')) return null
  if (!isActive || !message.trim() || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssAnimations }} />

      {/* SCHIUMA DI SAPONE */}
      <div
        ref={containerRef}
        className="fixed left-0 right-0 pointer-events-none"
        style={{ bottom: 36, height: 72, zIndex: 50 }}
      >
        <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="bubbleGrad" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.96)" />
              <stop offset="12%" stopColor="rgba(255,255,255,0.88)" />
              <stop offset="30%" stopColor="rgba(210,248,255,0.55)" />
              <stop offset="55%" stopColor="rgba(100,200,230,0.28)" />
              <stop offset="80%" stopColor="rgba(8,145,178,0.15)" />
              <stop offset="100%" stopColor="rgba(8,145,178,0.04)" />
            </radialGradient>
            <radialGradient id="highlightGrad" cx="30%" cy="25%" r="45%">
              <stop offset="0%" stopColor="rgba(255,255,255,1)" />
              <stop offset="25%" stopColor="rgba(255,255,255,0.75)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <linearGradient id="iridescent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,200,220,0.65)" />
              <stop offset="20%" stopColor="rgba(200,230,255,0.75)" />
              <stop offset="40%" stopColor="rgba(180,255,200,0.55)" />
              <stop offset="60%" stopColor="rgba(255,235,180,0.6)" />
              <stop offset="80%" stopColor="rgba(220,200,255,0.55)" />
              <stop offset="100%" stopColor="rgba(255,200,220,0.5)" />
            </linearGradient>
          </defs>

          {bubbles.map(b => {
            const age = (Date.now() - b.born) / 1000
            const progress = Math.max(0, Math.min(1, (age - b.delay) / b.dur))
            const isPopping = progress > 0.75

            let scale = 0
            let opacity = 0
            if (progress < 0.15) {
              const t = progress / 0.15
              scale = t * t * (3 - 2 * t)
              opacity = t
            } else if (progress < 0.75) {
              scale = 1
              opacity = 0.88
            } else {
              const t = (progress - 0.75) / 0.25
              scale = 1 + t * 0.8
              opacity = 0.88 * (1 - t * t)
            }

            return (
              <g
                key={b.id}
                transform={`translate(${b.x}, ${b.y}) scale(${scale})`}
                style={{
                  opacity,
                  transformOrigin: 'center',
                  animation: progress < 0.15
                    ? `bubble-wobble ${b.dur * 0.5}s ease-in-out ${b.delay}s infinite`
                    : 'none',
                }}
              >
                <circle
                  cx={0} cy={0} r={b.size / 2}
                  fill="url(#bubbleGrad)"
                  stroke="url(#iridescent)"
                  strokeWidth={isPopping ? 0.3 : 0.9}
                  opacity={isPopping ? 0.5 : 0.9}
                />
                <ellipse
                  cx={-b.size * 0.12} cy={-b.size * 0.18}
                  rx={b.size * 0.22} ry={b.size * 0.14}
                  fill="url(#highlightGrad)"
                  opacity={isPopping ? 0.3 : 0.92}
                />
                <ellipse
                  cx={b.size * 0.16} cy={b.size * 0.1}
                  rx={b.size * 0.07} ry={b.size * 0.05}
                  fill="rgba(255,255,255,0.65)"
                  opacity={isPopping ? 0.2 : 0.55}
                />
                {b.size > 18 && (
                  <circle
                    cx={-b.size * 0.05} cy={-b.size * 0.22}
                    r={b.size * 0.04}
                    fill="white"
                    opacity={isPopping ? 0.15 : 0.8}
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* TICKER */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center h-9 overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, #0c4a6e, #075985, #0891b2, #06b6d4, #0891b2, #075985, #0c4a6e)',
          backgroundSize: '400% 100%',
          animation: 'ticker-gradient 12s ease infinite',
          boxShadow: '0 -1px 0 rgba(255,255,255,0.15) inset, 0 -3px 12px rgba(8,145,178,0.25)',
        }}
      >
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div
            className="flex items-center whitespace-nowrap"
            style={{ animation: 'ticker-scroll 24s linear infinite' }}
          >
            {[0, 1, 2, 3].map(i => (
              <span key={i} className="text-white text-xs font-semibold px-10 tracking-wide">
                {message}
              </span>
            ))}
          </div>
          <div
            className="absolute top-0 pointer-events-none"
            style={{
              left: '-20%',
              width: '20%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: 'shine-sweep 6s ease-in-out infinite',
            }}
          />
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Chiudi"
          className="shrink-0 h-full px-3 flex items-center justify-center hover:bg-black/15 transition-colors relative z-10"
        >
          <X className="w-4 h-4 text-white/90" />
        </button>
      </div>
    </>
  )
}    }, 250 + Math.random() * 350)

    return () => clearInterval(interval)
  }, [isActive, dismissed, spawnBubble])

  // Pulizia bolle morte
  useEffect(() => {
    if (!isActive || dismissed) return
    const cleanup = setInterval(() => {
      const now = Date.now()
      setBubbles(prev => prev.filter(b => now - b.born < (b.dur + b.delay) * 1000 + 500))
    }, 1000)
    return () => clearInterval(cleanup)
  }, [isActive, dismissed])

  if (pathname?.startsWith('/mgadmin-panel')) return null
  if (!isActive || !message.trim() || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  return (
    <>
      {/* SCHIUMA DI SAPONE REALISTICA */}
      <div
        ref={containerRef}
        className="fixed left-0 right-0 pointer-events-none"
        style={{ bottom: 36, height: 72, zIndex: 50 }}
      >
        <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
          <defs>
            {/* Gradiente sferico 3D della bolla */}
            <radialGradient id="bubbleGrad" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.96)" />
              <stop offset="12%" stopColor="rgba(255,255,255,0.88)" />
              <stop offset="30%" stopColor="rgba(210,248,255,0.55)" />
              <stop offset="55%" stopColor="rgba(100,200,230,0.28)" />
              <stop offset="80%" stopColor="rgba(8,145,178,0.15)" />
              <stop offset="100%" stopColor="rgba(8,145,178,0.04)" />
            </radialGradient>

            {/* Riflesso speculare principale */}
            <radialGradient id="highlightGrad" cx="30%" cy="25%" r="45%">
              <stop offset="0%" stopColor="rgba(255,255,255,1)" />
              <stop offset="25%" stopColor="rgba(255,255,255,0.75)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>

            {/* Bordo iridescente arcobaleno */}
            <linearGradient id="iridescent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,200,220,0.65)" />
              <stop offset="20%" stopColor="rgba(200,230,255,0.75)" />
              <stop offset="40%" stopColor="rgba(180,255,200,0.55)" />
              <stop offset="60%" stopColor="rgba(255,235,180,0.6)" />
              <stop offset="80%" stopColor="rgba(220,200,255,0.55)" />
              <stop offset="100%" stopColor="rgba(255,200,220,0.5)" />
            </linearGradient>
          </defs>

          {bubbles.map(b => {
            const age = (Date.now() - b.born) / 1000
            const progress = Math.max(0, Math.min(1, (age - b.delay) / b.dur))
            const isPopping = progress > 0.75

            let scale = 0
            let opacity = 0

            if (progress < 0.15) {
              // Formazione: da 0 a dimensione piena
              const t = progress / 0.15
              scale = t * t * (3 - 2 * t) // smoothstep
              opacity = t
            } else if (progress < 0.75) {
              // Vita stabile
              scale = 1
              opacity = 0.88
            } else {
              // Scoppio
              const t = (progress - 0.75) / 0.25
              scale = 1 + t * 0.8
              opacity = 0.88 * (1 - t * t)
            }

            return (
              <g
                key={b.id}
                transform={`translate(${b.x}, ${b.y}) scale(${scale})`}
                style={{
                  opacity,
                  transformOrigin: 'center',
                  animation: progress < 0.15
                    ? `bubbleWobble ${b.dur * 0.5}s ease-in-out ${b.delay}s infinite`
                    : 'none',
                }}
              >
                {/* Bolla principale */}
                <circle
                  cx={0}
                  cy={0}
                  r={b.size / 2}
                  fill="url(#bubbleGrad)"
                  stroke="url(#iridescent)"
                  strokeWidth={isPopping ? 0.3 : 0.9}
                  opacity={isPopping ? 0.5 : 0.9}
                />
                {/* Riflesso speculare grande */}
                <ellipse
                  cx={-b.size * 0.12}
                  cy={-b.size * 0.18}
                  rx={b.size * 0.22}
                  ry={b.size * 0.14}
                  fill="url(#highlightGrad)"
                  opacity={isPopping ? 0.3 : 0.92}
                />
                {/* Riflesso secondario piccolo */}
                <ellipse
                  cx={b.size * 0.16}
                  cy={b.size * 0.1}
                  rx={b.size * 0.07}
                  ry={b.size * 0.05}
                  fill="rgba(255,255,255,0.65)"
                  opacity={isPopping ? 0.2 : 0.55}
                />
                {/* Scintilla extra su bolla grande */}
                {b.size > 18 && (
                  <circle
                    cx={-b.size * 0.05}
                    cy={-b.size * 0.22}
                    r={b.size * 0.04}
                    fill="white"
                    opacity={isPopping ? 0.15 : 0.8}
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* TICKER */}
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

        @keyframes bubbleWobble {
          0%, 100% { transform: scale(1, 1); }
          25% { transform: scale(1.06, 0.94); }
          50% { transform: scale(0.94, 1.06); }
          75% { transform: scale(1.03, 0.97); }
        }
      `}</style>
    </>
  )
}      })
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
