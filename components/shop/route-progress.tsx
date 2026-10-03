"use client"

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

// Barra ciano sottile in cima allo schermo che scorre quando si cambia pagina.
// Volutamente leggerissima: non blocca i click, non ritarda la navigazione e
// non copre la pagina. Ascolta soltanto i click sui link interni e finisce
// quando la pagina nuova è arrivata (oppure da sola dopo pochi secondi).
export function RouteProgress() {
  const pathname = usePathname()
  const barRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef(false)
  const pathRef = useRef(pathname)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach(t => window.clearTimeout(t))
    timers.current = []
  }

  const finish = () => {
    const bar = barRef.current
    if (!bar || !activeRef.current) return
    activeRef.current = false
    clearTimers()
    bar.style.transition = 'transform 0.25s ease-out'
    bar.style.transform = 'scaleX(1)'
    timers.current.push(window.setTimeout(() => {
      bar.style.transition = 'opacity 0.35s ease'
      bar.style.opacity = '0'
    }, 260))
    timers.current.push(window.setTimeout(() => {
      bar.style.transition = 'none'
      bar.style.transform = 'scaleX(0)'
    }, 650))
  }

  const start = () => {
    const bar = barRef.current
    if (!bar) return
    clearTimers()
    activeRef.current = true
    bar.style.transition = 'none'
    bar.style.opacity = '1'
    bar.style.transform = 'scaleX(0)'
    void bar.offsetWidth // forza il riavvio dell'animazione
    bar.style.transition = 'transform 6s cubic-bezier(0.1, 0.7, 0.2, 1)'
    bar.style.transform = 'scaleX(0.85)'
    // sicurezza: se per qualche motivo la pagina non cambia, la barra sparisce
    timers.current.push(window.setTimeout(finish, 8000))
  }

  // Pagina cambiata: completa la barra.
  useEffect(() => {
    pathRef.current = pathname
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onClick = (ev: MouseEvent) => {
      if (reduce.matches) return
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return
      const a = (ev.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a) return
      if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return
      let url: URL
      try { url = new URL(a.href, window.location.href) } catch { return }
      if (url.origin !== window.location.origin) return
      if (url.pathname === pathRef.current) return
      if (url.pathname.startsWith('/api') || url.pathname.startsWith('/mgadmin-panel')) return
      start()
    }
    // solo ascolto: nessun preventDefault, la navigazione parte subito come prima
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9999,
        pointerEvents: 'none', opacity: 0, transform: 'scaleX(0)', transformOrigin: 'left',
        background: 'linear-gradient(90deg, #0891b2, #22d3ee 60%, #67e8f9)',
        boxShadow: '0 0 10px rgba(34,211,238,0.7), 0 0 4px rgba(103,232,249,0.9)',
      }}
    />
  )
}
