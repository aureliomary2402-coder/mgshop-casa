"use client"

import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Rete di sicurezza: con blocchi molto alti (es. griglie con tanti prodotti)
    // il sensore di visibilità può non attivarsi mai perché richiede che una
    // percentuale importante dell'intero blocco sia visibile. Se dopo un
    // secondo non è ancora scattato, il contenuto va comunque mostrato:
    // meglio senza animazione che invisibile per sempre.
    const fallback = setTimeout(() => setVisible(true), 1000)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          clearTimeout(fallback)
          observer.disconnect()
        }
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(el)
    return () => { observer.disconnect(); clearTimeout(fallback) }
  }, [])

  return (
    <div ref={ref} className={`${visible ? 'reveal-visible' : 'reveal-hidden'} ${className}`} style={visible ? { animationDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  )
}
