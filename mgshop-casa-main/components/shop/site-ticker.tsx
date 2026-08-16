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
.site-ticker-foam { bottom: 22px; }
.site-ticker-bar { bottom: 0; }
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
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const sizeBase = isMobile ? 10 : 14
  const sizeRange = isMobile ? 10 : 14
  return {
    id,
    x: Math.random() * width,
    y: -6 - Math.random() * 10,
    size: sizeBase + Math.random() * sizeRange,
    speedY: 0.25 + Math.random() * 0.45,
    speedX: (Math.random() - 0.5) * 0.6,
    phase: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.015 + Math.random() * 0.025,
    wobbleAmp: 0.4 + Math.random() * 1.2,
    life: Math.random() * 60,
    maxLife: 320 + Math.random() * 280,
  }
}

const BUBBLE_COUNT = 8

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

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

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

  useEffect(() => {
    const updateWidth = () => {
      widthRef.current = containerRef.current?.offsetWidth || window.innerWidth
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  useEffect(() => {
    if (!isActive || dismissed) return

    const width = widthRef.current
    bubblesRef.current = Array.from({ length: BUBBLE_COUNT }, (_, i) => createBubble(i, width))

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

        b.y += b.speedY * dt
        b.x += (b.speedX + Math.sin(b.phase) * b.wobbleAmp * 0.2) * dt

        if (b.x < -b.size) b.x = widthRef.current + b.size
        if (b.x > widthRef.current + b.size) b.x = -b.size

        const birth = Math.min(b.life / 25, 1)
        const death = b.life > b.maxLife - 50 ? (b.maxLife - b.life) / 50 : 1
        const opacity = Math.min(birth, death)

        const wobbleX = 1 + Math.sin(b.phase * 1.3) * 0.06
        const wobbleY = 1 + Math.cos(b.phase * 1.7) * 0.06

        let pop = 1
        if (b.life > b.maxLife - 35) {
          pop = 1 + (b.life - (b.maxLife - 35)) / 35 * 1.2
        }

        el.style.transform = `translate(${b.x}px, ${-b.y}px) scale(${wobbleX * pop}, ${wobbleY * pop})`
        el.style.opacity = String(opacity)

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
      {/* SCHIUMA — dietro la striscia, z-index inferiore */}
      <div
        ref={containerRef}
        className="fixed left-0 right-0 pointer-events-none site-ticker-foam"
        style={{ height: 60, zIndex: 39 }}
      >
        {/* Cresta compatta sul bordo superiore della striscia */}
        <div
          style={{
            position: 'absolute',
            left: '-4%',
            right: '-4%',
            bottom: -4,
            height: 22,
            background: 'radial-gradient(ellipse 18px 14px at 50% 100%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.45) 42%, rgba(210,248,255,0.15) 75%, transparent 100%)',
            backgroundSize: '20px 18px',
          }}
        />

        {Array.from({ length: BUBBLE_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={el => { elsRef.current[i] = el }}
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 26%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.78) 16%, rgba(224,247,250,0.45) 40%, rgba(103,212,231,0.22) 68%, rgba(8,145,178,0.08) 92%, transparent 100%)',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: 'inset -1.5px -1.5px 3px rgba(8,145,178,0.1), inset 1.5px 1.5px 4px rgba(255,255,255,0.85)',
              opacity: 0,
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </div>

      {/* TICKER — in primo piano, copre la base delle bolle */}
      <div
        className="fixed left-0 right-0 flex items-center h-9 overflow-hidden site-ticker-bar"
        style={{
          zIndex: 40,
          background: 'linear-gradient(90deg, #0B3C65, #0B3C65, #2578A4, #97C3EE, #2578A4, #0B3C65, #0B3C65)',
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
