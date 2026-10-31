// Temi del sito. Per aggiungerne uno nuovo (Natale, Black Friday...):
// 1) aggiungi il nome in PopupThemeName e la voce in POPUP_THEMES (lib/popup-theme.ts)
// 2) aggiungi i simboli in lib/slot-theme.ts
// 3) aggiungi qui la voce in SITE_THEMES e THEME_COLORS
// 4) aggiungi i colori in THEME_PALETTES dentro applica-tema.py (e rilancialo) oppure
//    scrivi a mano il blocco html[data-theme="nome"] in app/globals.css
import type { PopupThemeName } from './popup-theme'

export type SiteThemeName = PopupThemeName

export const SITE_THEMES: { id: SiteThemeName; label: string; emoji: string; hint: string }[] = [
  { id: 'bolle', label: 'Originale', emoji: '🫧', hint: 'Azzurro acqua e bolle, il tema di sempre' },
  { id: 'halloween', label: 'Halloween', emoji: '🎃', hint: 'Arancio e viola, zucche, ragnatele e pipistrelli' },
]

// Colore della barra del browser sul telefono
export const THEME_COLORS: Record<SiteThemeName, string> = {
  bolle: '#0891b2',
  halloween: '#d95500',
}

// Se il database non risponde si usa questo
export const FALLBACK_THEME: SiteThemeName = 'bolle'

export interface SiteThemeRow {
  active_theme: string | null
  next_theme: string | null
  switch_at: string | null
}

export function isSiteTheme(v: unknown): v is SiteThemeName {
  return typeof v === 'string' && SITE_THEMES.some(t => t.id === v)
}

// Tema in vigore adesso: se il cambio programmato e arrivato all'orario, vale il nuovo.
export function resolveTheme(row: SiteThemeRow | null | undefined, now: Date = new Date()): SiteThemeName {
  if (!row) return FALLBACK_THEME
  if (isSiteTheme(row.next_theme) && row.switch_at) {
    const at = new Date(row.switch_at).getTime()
    if (!Number.isNaN(at) && now.getTime() >= at) return row.next_theme
  }
  return isSiteTheme(row.active_theme) ? row.active_theme : FALLBACK_THEME
}
