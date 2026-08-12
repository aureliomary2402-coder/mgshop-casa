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

const CSS = `
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

  // Inietta CSS nel head
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Fetch ticker
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
}
