"use client"

import { usePathname } from 'next/navigation'

// Decorazioni di Halloween FISSE (nessuna animazione, nessun filtro): costo quasi zero.
// Per toglierle basta rimuovere <HalloweenDecor /> da app/layout.tsx.
const CSS = `
.hw-layer { position: fixed; inset: 0; z-index: 30; pointer-events: none; overflow: hidden; }
.hw-item { position: absolute; line-height: 1; }
`

function Web({ flip }: { flip?: boolean }) {
  return (
    <svg
      width="130" height="130" viewBox="0 0 150 150" aria-hidden="true"
      style={{ position: 'absolute', top: 0, [flip ? 'right' : 'left']: 0, transform: flip ? 'scaleX(-1)' : undefined, opacity: 0.55 }}
    >
      <g fill="none" stroke="#c9b8e8" strokeWidth="1.2" strokeLinecap="round">
        <path d="M0 0 L150 0 M0 0 L0 150 M0 0 L120 120 M0 0 L135 55 M0 0 L55 135" />
        <path d="M30 0 Q22 22 0 30 M60 0 Q45 45 0 60 M95 0 Q70 70 0 95 M130 0 Q95 95 0 130" />
        <path d="M34 34 Q40 20 48 8 M34 34 Q20 40 8 48" />
      </g>
      <line x1="78" y1="0" x2="78" y2="76" stroke="#c9b8e8" strokeWidth="1" />
      <text x="69" y="94" fontSize="18">🕷️</text>
    </svg>
  )
}

export function HalloweenDecor() {
  const pathname = usePathname()
  if (pathname?.startsWith('/mgadmin-panel')) return null
  return (
    <div className="hw-layer" aria-hidden="true">
      <style>{CSS}</style>
      <Web />
      <Web flip />
      <span className="hw-item" style={{ top: '7%', left: '34%', fontSize: 22, transform: 'rotate(-12deg)' }}>🦇</span>
      <span className="hw-item" style={{ top: '12%', right: '28%', fontSize: 18, transform: 'rotate(10deg)' }}>🦇</span>
      <span className="hw-item" style={{ top: '4%', left: '58%', fontSize: 16, transform: 'rotate(-6deg)' }}>🦇</span>
      <span className="hw-item" style={{ left: -10, top: '44%', fontSize: 44, transform: 'rotate(-10deg)' }}>🎃</span>
      <span className="hw-item" style={{ right: -10, top: '60%', fontSize: 44, transform: 'rotate(10deg)' }}>🎃</span>
    </div>
  )
}
