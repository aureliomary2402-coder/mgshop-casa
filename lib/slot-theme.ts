// Simboli della slot per ogni tema del sito. Segue ACTIVE_POPUP_THEME
// (lib/popup-theme.ts): quando cambi tema, cambiano anche le emoji dei rulli.
import type { PopupThemeName } from './popup-theme'

// Simboli dei rulli (quelli che non vincono servono da riempitivo)
export const SLOT_SYMBOLS: Record<PopupThemeName, string[]> = {
  halloween: ['🕸️', '🦇', '🎃', '👻', '💀', '🍬'],
  bolle: ['🍋', '⭐', '🍒', '🔔', '🍀', '🍇'],
}

// Simbolo vincente = percentuale di sconto del coupon (tre simboli uguali)
export const SLOT_PRIZE_SYMBOLS: Record<PopupThemeName, Record<number, string>> = {
  halloween: { 5: '🕸️', 10: '🦇', 20: '🎃' },
  bolle: { 5: '🍋', 10: '⭐', 20: '🍒' },
}

export function symbolForDiscount(theme: PopupThemeName, percent: number): string | null {
  return SLOT_PRIZE_SYMBOLS[theme][Number(percent)] ?? null
}
