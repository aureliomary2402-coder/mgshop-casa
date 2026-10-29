import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
export const dynamic = 'force-dynamic'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

function clean(body: any) {
  const link = String(body.button_link ?? '').trim().slice(0, 500)
  const label = String(body.button_label ?? '').trim().slice(0, 40)
  return {
    title: String(body.title ?? '').trim().slice(0, 80),
    message: String(body.message ?? '').trim().slice(0, 600),
    // Il bottone compare solo se ci sono sia testo che link.
    button_label: link && label ? label : null,
    button_link: link && label ? link : null,
    frequency: body.frequency === 'once' ? 'once' : 'session',
    is_active: body.is_active === true,
  }
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('site_popups').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const fields = clean(await request.json())
  if (!fields.title && !fields.message) return NextResponse.json({ error: 'Scrivi almeno un titolo o un messaggio' }, { status: 400 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('site_popups').insert(fields).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
  const fields = clean(body)
  if (!fields.title && !fields.message) return NextResponse.json({ error: 'Scrivi almeno un titolo o un messaggio' }, { status: 400 })
  const supabase = createAdminClient()
  // updated_at cambia a ogni modifica: chi aveva già chiuso il vecchio testo lo rivede aggiornato.
  const { data, error } = await supabase
    .from('site_popups')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('site_popups').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
