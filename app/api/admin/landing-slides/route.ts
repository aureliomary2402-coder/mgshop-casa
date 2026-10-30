import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('landing_slides').select('*').order('display_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// Crea (senza id) o aggiorna (con id) una slide
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await request.json()
  const title = String(b.title || '').trim()
  if (!title) return NextResponse.json({ error: 'Il titolo è obbligatorio' }, { status: 400 })
  const row = {
    title,
    text: String(b.text || '').trim(),
    emoji: String(b.emoji || '').trim().slice(0, 16) || '🎃',
    gradient: ['viola', 'arancio', 'notte', 'zucca', 'mix'].includes(b.gradient) ? b.gradient : 'viola',
    image_url: b.image_url ? String(b.image_url) : null,
    cta_label: String(b.cta_label || '').trim(),
    cta_link: String(b.cta_link || '').trim(),
    is_active: b.is_active ?? true,
    updated_at: new Date().toISOString(),
  }
  const supabase = createAdminClient()
  if (b.id) {
    const { data, error } = await supabase.from('landing_slides').update(row).eq('id', b.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }
  const { data: last } = await supabase.from('landing_slides').select('display_order').order('display_order', { ascending: false }).limit(1).maybeSingle()
  const { data, error } = await supabase.from('landing_slides').insert({ ...row, display_order: (last?.display_order ?? -1) + 1 }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Riordino: riceve l'elenco degli id nell'ordine voluto
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { ids } = await request.json()
  if (!Array.isArray(ids)) return NextResponse.json({ error: 'Elenco mancante' }, { status: 400 })
  const supabase = createAdminClient()
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase.from('landing_slides').update({ display_order: i }).eq('id', ids[i])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('landing_slides').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
