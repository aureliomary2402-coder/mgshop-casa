import { FALLBACK_THEME, resolveTheme, type SiteThemeName, type SiteThemeRow } from '@/lib/site-theme'

// Legge la riga del tema da Supabase. Con `fresh` niente cache (slot, admin);
// altrimenti cache dati di 30 secondi, azzerata subito quando l'admin cambia tema.
async function readRow(fresh: boolean): Promise<SiteThemeRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const res = await fetch(`${url}/rest/v1/site_theme?select=active_theme,next_theme,switch_at&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 30, tags: ['site-theme'] } }),
  })
  if (!res.ok) return null
  const rows = await res.json()
  return Array.isArray(rows) && rows[0] ? (rows[0] as SiteThemeRow) : null
}

export async function getActiveTheme(): Promise<SiteThemeName> {
  try { return resolveTheme(await readRow(false)) } catch { return FALLBACK_THEME }
}

export async function getActiveThemeFresh(): Promise<SiteThemeName> {
  try { return resolveTheme(await readRow(true)) } catch { return FALLBACK_THEME }
}
