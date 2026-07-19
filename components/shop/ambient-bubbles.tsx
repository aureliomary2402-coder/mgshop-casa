interface AmbientBubblesProps {
  count?: number
  theme?: 'dark' | 'light'
}

export function AmbientBubbles({ count = 10, theme = 'dark' }: AmbientBubblesProps) {
  const bubbles = Array.from({ length: count }).map((_, i) => ({
    left: `${(i * 97) % 100}%`,
    size: 10 + ((i * 37) % 50),
    dur: 8 + ((i * 13) % 8),
    delay: (i * 1.7) % 6,
  }))

  const background = theme === 'dark'
    ? 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85), rgba(110,210,230,0.18) 45%, rgba(70,150,175,0.06) 72%, transparent 100%)'
    : 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9), rgba(100,116,139,0.15) 55%, transparent 100%)'
  const boxShadow = theme === 'dark'
    ? 'inset -4px -4px 10px rgba(255,255,255,0.35), inset 3px 3px 8px rgba(100,116,139,0.15), 0 0 14px rgba(150,235,250,0.12)'
    : '0 2px 6px rgba(100,116,139,0.1)'
  const border = theme === 'dark' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(100,116,139,0.15)'

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {bubbles.map((b, i) => (
        <div key={i} className="absolute rounded-full animate-bubble-rise"
          style={{
            left: b.left, bottom: '-60px', width: b.size, height: b.size,
            background, boxShadow, border,
            animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`,
          }} />
      ))}
    </div>
  )
}
