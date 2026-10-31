import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSiteTheme, resolveTheme, SITE_THEMES, type SiteThemeRow } from '@/lib/site-theme'

export const dynamic = 'force-dynamic'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

type Row = SiteThemeRow & { id: string }

async function getRow(supabase: ReturnType<typeof createAdminClient>): Promise<Row | null> {
  const { data } = await supabase.from('site_theme').select('*').limit(1).maybeSingle()
  if (data) return data as Row
  const { data: created } = await supabase.from('site_theme').insert({ active_theme: 'halloween' }).select().single()
  return (created as Row) ?? null
}

function refreshSite() {
  revalidateTag('site-theme')
  revalidatePath('/', 'layout')
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  let row = await getRow(supabase)
  if (!row) return NextResponse.json({ error: 'Tabella non trovata: esegui add-site-theme.sql su Supabase' }, { status: 500 })
  // Cambio programmato scaduto: diventa il tema attivo e la programmazione si azzera.
  if (isSiteTheme(row.next_theme) && row.switch_at && Date.now() >= new Date(row.switch_at).getTime()) {
    const { data } = await supabase.from('site_theme')
      .update({ active_theme: row.next_theme, next_theme: null, switch_at: null, updated_at: new Date().toISOString() })
      .eq('id', row.id).select().single()
    if (data) row = data as Row
  }
  return NextResponse.json({ row, effective: resolveTheme(row), themes: SITE_THEMES })
}

// action: 'activate' (tema subito, annulla la programmazione) | 'schedule' (tema + data/ora) | 'cancel_schedule'
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const supabase = createAdminClient()
  const row = await getRow(supabase)
  if (!row) return NextResponse.json({ error: 'Tabella non trovata: esegui add-site-theme.sql su Supabase' }, { status: 500 })

  let patch: Record<string, unknown>
  if (body.action === 'activate') {
    if (!isSiteTheme(body.theme)) return NextResponse.json({ error: 'Tema non valido' }, { status: 400 })
    patch = { active_theme: body.theme, next_theme: null, switch_at: null }
  } else if (body.action === 'schedule') {
    const at = new Date(body.at)
    if (!isSiteTheme(body.theme)) return NextResponse.json({ error: 'Tema non valido' }, { status: 400 })
    if (Number.isNaN(at.getTime())) return NextResponse.json({ error: 'Data e ora non valide' }, { status: 400 })
    // Si parte dal tema che vale adesso, poi scatta il nuovo all'orario scelto.
    patch = { active_theme: resolveTheme(row), next_theme: body.theme, switch_at: at.toISOString() }
  } else if (body.action === 'cancel_schedule') {
    patch = { active_theme: resolveTheme(row), next_theme: null, switch_at: null }
  } else {
    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
  }

  const { data, error } = await supabase.from('site_theme')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', row.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  refreshSite()
  return NextResponse.json({ row: data, effective: resolveTheme(data as Row) })
}
