import type { CSSProperties, ComponentType } from 'react'

// Riproduce la stessa "bolla vetro" della home (vedi app/page.tsx) sopra
// l'hero di ogni pagina, con la stessa icona/colore della bolla che porta
// a quella pagina, cosi' il logo resta coerente ovunque.
function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r},${g},${b}`
}

export function PageHeroIcon({
  icon: Icon,
  color,
  size = 'md',
}: {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  color: string
  size?: 'md' | 'lg'
}) {
  const rgb = hexToRgb(color)
  const wrap = size === 'lg' ? 'w-24 h-24 md:w-32 md:h-32' : 'w-20 h-20 md:w-28 md:h-28'
  const iconSize = size === 'lg' ? 'w-10 h-10 md:w-14 md:h-14' : 'w-9 h-9 md:w-12 md:h-12'

  return (
    <div
      className={`glass-bubble ${wrap} mx-auto mb-4 rounded-full flex items-center justify-center overflow-hidden animate-bubble-bob`}
      style={{ '--tint': `rgba(${rgb},0.30)`, '--tint-strong': `rgba(${rgb},0.38)` } as CSSProperties}
    >
      <span className="glass-bubble-sheen" />
      <Icon className={`relative z-10 ${iconSize}`} style={{ color }} />
    </div>
  )
}
