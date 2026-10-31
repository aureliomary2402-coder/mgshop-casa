#!/usr/bin/env python3
# Applica agli file esistenti le modifiche per lo switch dei temi.
import sys
def edit(path, pairs):
    s = open(path, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s: sys.exit(f'NON TROVATO in {path}: {a[:60]!r} (gia applicato?)')
        s = s.replace(a, b)
    open(path, 'w', encoding='utf-8').write(s)

edit('lib/popup-theme.ts', [
("""// Tema grafico dei pop up. Per cambiare stile a tutto il sito basta cambiare
// ACTIVE_POPUP_THEME qui sotto (es. quando finisce Halloween: 'bolle').
// Per un nuovo tema (Natale, Black Friday...) si aggiunge una voce in POPUP_THEMES.
""", """// Tema grafico dei pop up e della slot. Il tema in vigore si sceglie dal pannello
// admin (scheda "Tema del sito"). Per un nuovo tema (Natale, Black Friday...)
// si aggiunge una voce in POPUP_THEMES (vedi anche lib/site-theme.ts).
"""),
("\nexport const ACTIVE_POPUP_THEME: PopupThemeName = 'halloween'\n", "")])

edit('components/shop/halloween-decor.tsx', [
("import { usePathname } from 'next/navigation'\n", "import { usePathname } from 'next/navigation'\nimport { useSiteTheme } from '@/components/site-theme-provider'\n"),
("// Per toglierle basta rimuovere <HalloweenDecor /> da app/layout.tsx.", "// Compaiono solo quando il tema del sito e Halloween (pannello admin > Tema del sito)."),
("  const pathname = usePathname()\n  if (pathname?.startsWith('/mgadmin-panel')) return null", "  const pathname = usePathname()\n  const theme = useSiteTheme()\n  if (theme !== 'halloween') return null\n  if (pathname?.startsWith('/mgadmin-panel')) return null")])

edit('components/shop/site-popup.tsx', [
("import { ACTIVE_POPUP_THEME, POPUP_THEMES, type PopupThemeName } from '@/lib/popup-theme'", "import { POPUP_THEMES, type PopupThemeName } from '@/lib/popup-theme'\nimport { useSiteTheme } from '@/components/site-theme-provider'"),
("export function SitePopupView({ popup, onClose, theme = ACTIVE_POPUP_THEME }: {", "export function SitePopupView({ popup, onClose, theme }: {"),
("  const t = POPUP_THEMES[theme]\n", "  const siteTheme = useSiteTheme()\n  const t = POPUP_THEMES[theme ?? siteTheme]\n")])

edit('components/shop/slot-machine.tsx', [
("import { ACTIVE_POPUP_THEME, POPUP_THEMES } from '@/lib/popup-theme'", "import { POPUP_THEMES } from '@/lib/popup-theme'\nimport { useSiteTheme } from '@/components/site-theme-provider'"),
("sito (ACTIVE_POPUP_THEME): ora Halloween.", "sito (scheda \"Tema del sito\" nel pannello admin)."),
("  const theme = POPUP_THEMES[ACTIVE_POPUP_THEME]\n  const pool = SLOT_SYMBOLS[ACTIVE_POPUP_THEME]", "  const siteTheme = useSiteTheme()\n  const theme = POPUP_THEMES[siteTheme]\n  const pool = SLOT_SYMBOLS[siteTheme]"),
("SLOT_PRIZE_SYMBOLS[ACTIVE_POPUP_THEME]", "SLOT_PRIZE_SYMBOLS[siteTheme]")])

edit('components/shop/benefits-carousel.tsx', [
("import { ACTIVE_POPUP_THEME } from '@/lib/popup-theme'", "import { useSiteTheme } from '@/components/site-theme-provider'"),
("  const pool = SLOT_SYMBOLS[ACTIVE_POPUP_THEME]", "  const siteTheme = useSiteTheme()\n  const pool = SLOT_SYMBOLS[siteTheme]")])

p = 'components/admin/slot-manager.tsx'
s = open(p, encoding='utf-8').read()
s = s.replace("import { ACTIVE_POPUP_THEME } from '@/lib/popup-theme'", "import { useSiteTheme } from '@/components/site-theme-provider'")
s = s.replace("export function SlotManager() {\n", "export function SlotManager() {\n  const siteTheme = useSiteTheme()\n", 1)
s = s.replace("ACTIVE_POPUP_THEME", "siteTheme")
open(p, 'w', encoding='utf-8').write(s)

edit('app/api/slot/spin/route.ts', [
("import { ACTIVE_POPUP_THEME } from '@/lib/popup-theme'", "import { getActiveThemeFresh } from '@/lib/site-theme-server'"),
("    const pool = SLOT_SYMBOLS[ACTIVE_POPUP_THEME]", "    const theme = await getActiveThemeFresh()\n    const pool = SLOT_SYMBOLS[theme]"),
("symbolForDiscount(ACTIVE_POPUP_THEME,", "symbolForDiscount(theme,")])

edit('app/layout.tsx', [
("import { HalloweenDecor }", "import { SiteThemeProvider } from '@/components/site-theme-provider'\nimport { getActiveTheme } from '@/lib/site-theme-server'\nimport { THEME_COLORS } from '@/lib/site-theme'\nimport { HalloweenDecor }"),
("""export const viewport: Viewport = {
  themeColor: '#d95500',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={inter.variable}>
      <body className={inter.className}>
""", """// Il colore della barra del browser segue il tema del sito
export async function generateViewport(): Promise<Viewport> {
  const theme = await getActiveTheme()
  return {
    themeColor: THEME_COLORS[theme],
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Tema scelto dal pannello admin (scheda "Tema del sito"): sta su <html data-theme>
  // e le variabili CSS in globals.css cambiano tutti i colori del sito.
  const theme = await getActiveTheme()
  return (
    <html lang="it" className={inter.variable} data-theme={theme} suppressHydrationWarning>
      <body className={inter.className}>
        <SiteThemeProvider initial={theme}>
"""),
("        <Analytics />\n      </body>", "        <Analytics />\n        </SiteThemeProvider>\n      </body>")])

edit('app/mgadmin-panel/page.tsx', [
("import { SlotManager } from '@/components/admin/slot-manager'\n", "import { SlotManager } from '@/components/admin/slot-manager'\nimport { ThemeManager } from '@/components/admin/theme-manager'\n"),
("| 'slot' | 'carosello'", "| 'slot' | 'carosello' | 'tema'"),
("Dices, GalleryHorizontal }", "Dices, GalleryHorizontal, Palette }"),
("  { id: 'visite', label: 'Visite'", "  { id: 'tema', label: 'Tema del sito', icon: Palette, color: 'text-violet-600 bg-violet-50', group: 'generale' },\n  { id: 'visite', label: 'Visite'"),
("        {activeTab === 'slot' && <SlotManager />}", "        {activeTab === 'slot' && <SlotManager />}\n        {activeTab === 'tema' && <ThemeManager />}")])
print('Modifiche applicate.')
