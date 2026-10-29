// Tema grafico dei pop up. Per cambiare stile a tutto il sito basta cambiare
// ACTIVE_POPUP_THEME qui sotto (es. quando finisce Halloween: 'bolle').
// Per un nuovo tema (Natale, Black Friday...) si aggiunge una voce in POPUP_THEMES.

export type PopupThemeName = 'halloween' | 'bolle'

export interface PopupTheme {
  badge: string // emoji che "sporge" sopra il pop up
  decor: 'halloween' | 'bolle' // decorazioni disegnate dentro la scheda
  backdrop: string
  cardBg: string
  border: string
  glow: string
  title: string
  text: string
  closeBg: string
  closeColor: string
  buttonBg: string
  buttonText: string
  buttonGlow: string
}

export const POPUP_THEMES: Record<PopupThemeName, PopupTheme> = {
  halloween: {
    badge: '🎃',
    decor: 'halloween',
    backdrop: 'rgba(10,4,20,0.72)',
    cardBg: 'linear-gradient(160deg, #24103f 0%, #160b29 55%, #0f0720 100%)',
    border: '1px solid rgba(255,176,102,0.4)',
    glow: '0 0 38px rgba(255,143,51,0.28), 0 18px 50px rgba(0,0,0,0.55)',
    title: '#ffe9d2',
    text: '#eadfff',
    closeBg: 'rgba(255,255,255,0.12)',
    closeColor: '#ffffff',
    buttonBg: 'linear-gradient(135deg, #ffb066 0%, #ff8f33 55%, #ff7a1a 100%)',
    buttonText: '#150b26',
    buttonGlow: '0 8px 22px rgba(255,143,51,0.4)',
  },
  bolle: {
    badge: '🫧',
    decor: 'bolle',
    backdrop: 'rgba(15,40,60,0.55)',
    cardBg: 'linear-gradient(160deg, #ffffff 0%, #ecfeff 100%)',
    border: '1px solid rgba(8,145,178,0.28)',
    glow: '0 0 30px rgba(103,212,231,0.4), 0 18px 46px rgba(15,60,80,0.3)',
    title: '#0e3b48',
    text: '#334155',
    closeBg: 'rgba(14,59,72,0.08)',
    closeColor: '#0e3b48',
    buttonBg: 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
    buttonText: '#ffffff',
    buttonGlow: '0 8px 22px rgba(8,145,178,0.35)',
  },
}

export const ACTIVE_POPUP_THEME: PopupThemeName = 'halloween'
