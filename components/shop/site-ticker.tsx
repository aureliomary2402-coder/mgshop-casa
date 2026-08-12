"use client"

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

const DISMISS_KEY = 'mgshop_ticker_dismissed'

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
`

interface BubbleData {
  id: number
  x: number
  y: number
  size: number
  speedY: number
  speedX: number
  phase: number
  wobbleSpeed: number
  wobbleAmp: number
  life: number
  maxLife: number
}

function createBubble(id: number, width: number): BubbleData {
  return {
    id,
    x: Math.random() * width,
    y: Math.random() * 12,
    size: 16 + Math.random() * 24,
    speedY: 0.3 + Math.random() * 0.55,
    speedX: (Math.random() - 0.5) * 0.7,
    phase: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.018 + Math.random() * 0.028,
    wobbleAmp: 0.5 + Math.random() * 1.5,
    life: Math.random() * 80,
    maxLife: 280 + Math.random() * 320,
  }
}

const BUBBLE_COUNT = 10

export function SiteTicker() {
  const pathname = usePathname()
  const [message, setMessage] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const bubblesRef = useRef<BubbleData[]>([])
  const elsRef = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(1200)

  // Inietta CSS nel head
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
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

  // Resize
  useEffect(() => {
    const updateWidth = () => {
      widthRef.current = containerRef.current?.offsetWidth || window.innerWidth
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Animazione bolle via requestAnimationFrame
  useEffect(() => {
    if (!isActive || dismissed) return

    const width = widthRef.current
    bubblesRef.current = Array.from({ length: BUBBLE_COUNT }, (_, i) => createBubble(i, width))

    // Dimensioni iniziali
    bubblesRef.current.forEach((b, i) => {
      const el = elsRef.current[i]
      if (el) {
        el.style.width = b.size + 'px'
        el.style.height = b.size + 'px'
      }
    })

    let lastTime = performance.now()

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 16, 3)
      lastTime = time

      bubblesRef.current.forEach((b, i) => {
        const el = elsRef.current[i]
        if (!el) return

        b.life += dt
        b.phase += b.wobbleSpeed * dt

        // Movimento: salita + drift ondulatorio laterale
        b.y += b.speedY * dt
        b.x += (b.speedX + Math.sin(b.phase) * b.wobbleAmp * 0.25) * dt

        // Wrap orizzontale
        if (b.x < -b.size) b.x = widthRef.current + b.size
        if (b.x > widthRef.current + b.size) b.x = -b.size

        // Opacity: fade in + fade out
        const birth = Math.min(b.life / 30, 1)
        const death = b.life > b.maxLife - 55 ? (b.maxLife - b.life) / 55 : 1
        const opacity = Math.min(birth, death)

        // Wobble di forma (non perfettamente sferiche, come le bolle vere)
        const wobbleX = 1 + Math.sin(b.phase * 1.3) * 0.07
        const wobbleY = 1 + Math.cos(b.phase * 1.7) * 0.07

        // Pop finale: si gonfia e scoppia
        let pop = 1
        if (b.life > b.maxLife - 40) {
          pop = 1 + (b.life - (b.maxLife - 40)) / 40 * 1.4
        }

        el.style.transform = `translate(${b.x}px, ${-b.y}px) scale(${wobbleX * pop}, ${wobbleY * pop})`
        el.style.opacity = String(opacity * 0.92)

        // Reset quando muore
        if (b.life >= b.maxLife) {
          const nb = createBubble(b.id, widthRef.current)
          Object.assign(b, nb)
          el.style.width = b.size + 'px'
          el.style.height = b.size + 'px'
        }
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isActive, dismissed])

  if (pathname?.startsWith('/mgadmin-panel')) return null
  if (!isActive || !message.trim() || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  return (
    <>
      {/* SCHIUMA 3D */}
      <div
        ref={containerRef}
        className="fixed left-0 right-0 pointer-events-none"
        style={{ bottom: 30, height: 90, zIndex: 50 }}
      >
        {/* Cresta continua che copre tutto il bordo superiore del ticker */}
        <div
          style={{
            position: 'absolute',
            left: '-5%',
            right: '-5%',
            bottom: -6,
            height: 32,
            background: 'radial-gradient(ellipse 20px 16px at 50% 100%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 40%, rgba(210,248,255,0.2) 72%, transparent 100%)',
            backgroundSize: '24px 22px',
            opacity: 0.9,
          }}
        />

        {/* 10 bolle dinamiche animate via rAF — GPU fluido */}
        {Array.from({ length: BUBBLE_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={el => { elsRef.current[i] = el }}
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.8) 14%, rgba(224,247,250,0.5) 38%, rgba(103,212,231,0.25) 66%, rgba(8,145,178,0.1) 90%, transparent 100%)',
              border: '1.2px solid rgba(255,255,255,0.55)',
              boxShadow: 'inset -2px -2px 4px rgba(8,145,178,0.1), inset 2px 2px 5px rgba(255,255,255,0.9), 0 1px 5px rgba(8,145,178,0.06)',
              opacity: 0,
              willChange: 'transform, opacity',
            }}
          />
        ))}
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
