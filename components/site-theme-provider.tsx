"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { FALLBACK_THEME, THEME_COLORS, isSiteTheme, type SiteThemeName } from '@/lib/site-theme'

const ThemeContext = createContext<SiteThemeName>(FALLBACK_THEME)

// Tema in vigore. Il server lo scrive gia su <html data-theme>: i colori cambiano
// da soli (variabili CSS). Qui si tiene allineato il resto (decorazioni, simboli
// della slot, pop up) e si riallinea se il cambio scatta con la pagina aperta.
export function SiteThemeProvider({ initial, children }: { initial: SiteThemeName; children: ReactNode }) {
  const [theme, setTheme] = useState<SiteThemeName>(initial)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', THEME_COLORS[theme])
  }, [theme])

  useEffect(() => {
    let stop = false
    const check = () => {
      fetch('/api/theme', { cache: 'no-store' })
        .then(r => r.json())
        .then(d => { if (!stop && isSiteTheme(d?.theme)) setTheme(d.theme) })
        .catch(() => {})
    }
    check()
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    const iv = window.setInterval(onVisible, 60000)
    return () => { stop = true; document.removeEventListener('visibilitychange', onVisible); window.clearInterval(iv) }
  }, [])

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useSiteTheme(): SiteThemeName {
  return useContext(ThemeContext)
}
