"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

const DISMISS_KEY = 'mgshop_ticker_dismissed'

const CSS = [
  '@keyframes ticker-gradient {',
  '  0%, 100% { background-position: 0% 50%; }',
  '  50% { background-position: 100% 50%; }',
  '}',
  '@keyframes ticker-scroll {',
  '  from { transform: translateX(0); }',
  '  to { transform: translateX(-25%); }',
  '}',
  '@keyframes shine-sweep {',
  '  0% { left: -20%; }',
  '  35% { left: 120%; }',
  '  100% { left: 120%; }',
  '}',
  '@keyframes bubble-pop {',
  '  0% { transform: scale(0); opacity: 0; }',
  '  10% { opacity: 0.95; }',
  '  20% { transform: scale(1); opacity: 0.92; }',
  '  65% { transform: scale(1.08); opacity: 0.85; }',
  '  80% { transform: scale(1.3); opacity: 0.4; }',
  '  100% { transform: scale(1.9); opacity: 0; }',
  '}',
  '@keyframes bubble-rise {',
  '  0% { transform: scale(0.3) translateY(0); opacity: 0; }',
  '  12% { opacity: 0.9; }',
  '  35% { transform: scale(1) translateY(-18px); opacity: 0.8; }',
  '  75% { transform: scale(1.15) translateY(-40px); opacity: 0.35; }',
  '  100% { transform: scale(1.6) translateY(-55px); opacity: 0; }',
  '}',
].join('\n')

function makeBubbles(count: number, minSize: number, maxSize: number, minBottom: number, maxBottom: number, anim: string) {
  const bubbles = []
  for (let i = 0; i < count; i++) {
    const seed = i * 997
    const size = minSize + (seed % (maxSize - minSize + 1))
    const left = (seed * 6.7) % 98
    const bottom = minBottom + (seed % (maxBottom - minBottom + 1))
    const dur = 3 + (seed % 40) / 10
    const delay = (seed % 60) / 10
    bubbles.push({
      id: i,
      left: left + '%',
      bottom: bottom + 'px',
      size,
      dur,
      delay,
      anim,
    })
  }
  return bubbles
}

export function SiteTicker() {
  const pathname = usePathname()
  const [message, setMessage] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [dismissed, setDismissed] = useState(false)

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

  const largeBubbles = makeBubbles(30, 16, 32, 0, 20, 'bubble-pop')
  const mediumBubbles = makeBubbles(25, 10, 18, 5, 30, 'bubble-pop')
  const smallBubbles = makeBubbles(20, 5, 12, 10, 45, 'bubble-rise')

  if (pathname?.startsWith('/mgadmin-panel')) return null
  if (!isActive || !message.trim() || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  const bubbleBase = {
    position: 'absolute' as const,
    borderRadius: '50%',
    pointerEvents: 'none' as const,
  }

  const renderBubble = (b: ReturnType<typeof makeBubbles>[0], isLarge: boolean) => {
    const opacity = isLarge ? 0.9 : 0.75
    const blur = isLarge ? 0 : 0.3

    return (
      <div
        key={b.id + '-' + b.anim}
        style={{
          ...bubbleBase,
          left: b.left,
          bottom: b.bottom,
          width: b.size,
          height: b.size,
          background: isLarge
            ? 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.88) 14%, rgba(224,247,250,0.65) 34%, rgba(103,212,231,0.35) 62%, rgba(8,145,178,0.18) 88%, transparent 100%)'
            : 'radial-gradient(circle at 30% 26%, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.75) 18%, rgba(210,248,255,0.5) 42%, rgba(100,200,230,0.25) 70%, rgba(8,145,178,0.1) 92%, transparent 100%)',
          border: '1px solid rgba(255,255,255,' + (isLarge ? '0.65' : '0.45') + ')',
          boxShadow: isLarge
            ? 'inset -2px -2px 4px rgba(8,145,178,0.18), inset 2px 2px 5px rgba(255,255,255,0.92), 0 1px 4px rgba(8,145,178,0.12), 0 0 10px rgba(255,255,255,0.25)'
            : 'inset -1px -1px 2px rgba(8,145,178,0.12), inset 1px 1px 3px rgba(255,255,255,0.8), 0 0 5px rgba(255,255,255,0.15)',
          opacity,
          filter: blur ? 'blur(' + blur + 'px)' : undefined,
          animation: b.anim + ' ' + b.dur + 's ease-out ' + b.delay + 's infinite',
          zIndex: isLarge ? 3 : 2,
        }}
      />
    )
  }

  return (
    <>
      {/* SCHIUMA 3D — copre tutto il bordo superiore del ticker */}
      <div
        className="fixed left-0 right-0 pointer-events-none"
        style={{ bottom: 30, height: 70, zIndex: 50 }}
      >
        {smallBubbles.map(b => renderBubble(b, false))}
        {mediumBubbles.map(b => renderBubble(b, false))}
        {largeBubbles.map(b => renderBubble(b, true))}

        {/* Cresta di schiuma compatta sul bordo */}
        <div
          style={{
            position: 'absolute',
            left: '-5%',
            right: '-5%',
            bottom: -2,
            height: 24,
            background: 'radial-gradient(ellipse 14px 10px at 50% 100%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 45%, rgba(210,248,255,0.3) 75%, transparent 100%)',
            backgroundSize: '18px 16px',
            opacity: 0.8,
          }}
        />
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
