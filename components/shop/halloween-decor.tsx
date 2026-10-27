"use client"

import type { CSSProperties } from 'react'
import { usePathname } from 'next/navigation'

// Decorazioni di Halloween FISSE (nessuna animazione, nessun filtro): costo quasi zero.
// Per toglierle basta rimuovere <HalloweenDecor /> da app/layout.tsx.
const CSS = `
.hw-layer { position: fixed; inset: 0; z-index: 30; pointer-events: none; overflow: hidden; }
.hw-item { position: absolute; line-height: 1; }
`

const WEB = '#9d7fe0'

function Web({ flip }: { flip?: boolean }) {
  return (
    <svg
      width="150" height="150" viewBox="0 0 150 150" aria-hidden="true"
      style={{ position: 'absolute', top: 0, [flip ? 'right' : 'left']: 0, transform: flip ? 'scaleX(-1)' : undefined, opacity: 0.8 }}
    >
      <g fill="none" stroke={WEB} strokeWidth="1.6" strokeLinecap="round">
        <path d="M0 0 L150 0 M0 0 L0 150 M0 0 L120 120 M0 0 L135 55 M0 0 L55 135" />
        <path d="M30 0 Q22 22 0 30 M60 0 Q45 45 0 60 M95 0 Q70 70 0 95 M130 0 Q95 95 0 130" />
        <path d="M34 34 Q40 20 48 8 M34 34 Q20 40 8 48" />
      </g>
      <line x1="78" y1="0" x2="78" y2="76" stroke={WEB} strokeWidth="1.2" />
      <text x="67" y="96" fontSize="22">🕷️</text>
    </svg>
  )
}

function Bat({ size, style }: { size: number; style: CSSProperties }) {
  return (
    <svg
      className="hw-item" width={size} height={size / 2} viewBox="0 0 64 32" aria-hidden="true"
      style={style}
    >
      <path
        d="M32 10 C30 6 28 4 27 2 C26 6 25 8 22 9 C17 6 9 5 0 9 C6 11 8 15 8 21 C12 17 17 16 21 18 C23 22 27 25 32 30 C37 25 41 22 43 18 C47 16 52 17 56 21 C56 15 58 11 64 9 C55 5 47 6 42 9 C39 8 38 6 37 2 C36 4 34 6 32 10 Z"
        fill="#1a0933" stroke="#a78bfa" strokeWidth="1.2" strokeLinejoin="round"
      />
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
      <Bat size={40} style={{ top: '6%', left: '30%', transform: 'rotate(-12deg)' }} />
      <Bat size={30} style={{ top: '11%', right: '26%', transform: 'rotate(10deg)' }} />
      <Bat size={24} style={{ top: '3%', left: '58%', transform: 'rotate(-6deg)' }} />
      <Bat size={34} style={{ top: '38%', right: '6%', transform: 'rotate(14deg)' }} />
      <span className="hw-item" style={{ left: -10, top: '44%', fontSize: 44, transform: 'rotate(-10deg)' }}>🎃</span>
      <span className="hw-item" style={{ right: -10, top: '60%', fontSize: 44, transform: 'rotate(10deg)' }}>🎃</span>
    </div>
  )
}
