"use client"

import { usePathname } from 'next/navigation'

// Decorazioni di Halloween (temporanee): ragnatele, pipistrelli e zucche.
// Per toglierle basta rimuovere <HalloweenDecor /> da app/layout.tsx.
const CSS = `
@keyframes hw-bat {
  from { transform: translateX(-12vw) translateY(0) rotate(-4deg); }
  25% { transform: translateX(22vw) translateY(14px) rotate(5deg); }
  50% { transform: translateX(55vw) translateY(-8px) rotate(-4deg); }
  75% { transform: translateX(85vw) translateY(12px) rotate(5deg); }
  to { transform: translateX(112vw) translateY(0) rotate(-4deg); }
}
@keyframes hw-bob {
  0%, 100% { transform: translateY(0) rotate(-6deg); }
  50% { transform: translateY(-8px) rotate(6deg); }
}
.hw-layer { position: fixed; inset: 0; z-index: 30; pointer-events: none; overflow: hidden; }
.hw-bat { position: absolute; left: 0; font-size: 24px; animation: hw-bat 22s linear infinite; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
.hw-pumpkin { position: absolute; font-size: 44px; animation: hw-bob 4.5s ease-in-out infinite; filter: drop-shadow(0 4px 6px rgba(0,0,0,.35)); }
@media (prefers-reduced-motion: reduce) {
  .hw-bat { animation: none; left: 70%; }
  .hw-pumpkin { animation: none; }
}
`

function Web({ flip }: { flip?: boolean }) {
  return (
    <svg
      width="150" height="150" viewBox="0 0 150 150" aria-hidden="true"
      style={{ position: 'absolute', top: 0, [flip ? 'right' : 'left']: 0, transform: flip ? 'scaleX(-1)' : undefined, opacity: 0.55 }}
    >
      <g fill="none" stroke="#c9b8e8" strokeWidth="1.2" strokeLinecap="round">
        <path d="M0 0 L150 0 M0 0 L0 150 M0 0 L120 120 M0 0 L135 55 M0 0 L55 135" />
        <path d="M30 0 Q22 22 0 30 M60 0 Q45 45 0 60 M95 0 Q70 70 0 95 M130 0 Q95 95 0 130" />
        <path d="M34 34 Q40 20 48 8 M34 34 Q20 40 8 48" />
      </g>
      <g transform="translate(78 80)">
        <line x1="0" y1="-80" x2="0" y2="-4" stroke="#c9b8e8" strokeWidth="1" />
        <text x="-9" y="14" fontSize="18">🕷️</text>
      </g>
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
      <span className="hw-bat" style={{ top: '9%', animationDelay: '0s' }}>🦇</span>
      <span className="hw-bat" style={{ top: '16%', animationDelay: '-9s', fontSize: 18 }}>🦇</span>
      <span className="hw-bat" style={{ top: '5%', animationDelay: '-15s', fontSize: 20 }}>🦇</span>
      <span className="hw-pumpkin" style={{ left: -12, top: '42%' }}>🎃</span>
      <span className="hw-pumpkin" style={{ right: -12, top: '58%', animationDelay: '-2s' }}>🎃</span>
    </div>
  )
}
