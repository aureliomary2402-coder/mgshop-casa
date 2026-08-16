"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowUp } from 'lucide-react'

// Compare a sinistra in basso (il menu fluttuante social/chat occupa già
// il lato destro) dopo un po' di scroll, su qualsiasi pagina. Utile
// soprattutto su negozio/volantino/promo dove la lista prodotti è lunga.
export function BackToTop() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (pathname?.startsWith('/mgadmin-panel')) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Torna su"
      className="fixed bottom-[5.5rem] md:bottom-12 left-5 z-40 w-11 h-11 rounded-full flex items-center justify-center btn-press transition-all duration-300"
      style={{
        background: 'white',
        border: '1px solid rgba(8,145,178,0.15)',
        boxShadow: '0 4px 16px rgba(8,145,178,0.2)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.85)',
        pointerEvents: visible ? 'auto' : 'none',
      }}>
      <ArrowUp className="w-5 h-5" style={{ color: '#2578A4' }} />
    </button>
  )
}
