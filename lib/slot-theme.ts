// Simboli della slot per ogni tema del sito. Segue ACTIVE_POPUP_THEME
// (lib/popup-theme.ts): quando cambi tema, cambiano anche le emoji dei rulli.
import type { PopupThemeName } from './popup-theme'

export const SLOT_SYMBOLS: Record<PopupThemeName, string[]> = {
  halloween: ['🎃', '👻', '🦇', '🕷️', '💀', '🍬'],
  bolle: ['🫧', '💧', '🧼', '✨', '🧽', '🍋'],
}
