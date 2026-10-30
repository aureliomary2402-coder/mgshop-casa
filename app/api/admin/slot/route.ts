import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

async function getSettings(supabase: ReturnType<typeof createAdminClient>) {
  const { data } = await supabase.from('slot_settings').select('*').limit(1).maybeSingle()
  if (data) return data
  const { data: created } = await supabase.from('slot_settings').insert({ is_active: false, win_probability: 20 }).select().single()
  return created
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const settings = await getSettings(supabase)
  const { data: prizes } = await supabase.from('slot_prizes').select('*').order('discount_percent', { ascending: true })
  const { data: spins } = await supabase.from('slot_spins').select('id, phone_number, won, prize_label, discount_percent, used_order_id, created_at').order('created_at', { ascending: false }).limit(40)
  return NextResponse.json({ settings, prizes: prizes || [], spins: spins || [] })
}

// Impostazioni: attiva/disattiva e probabilita di vittoria (modificabile quando vuoi)
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()
  const current = await getSettings(supabase)
  if (!current) return NextResponse.json({ error: 'Impostazioni non trovate: esegui add-slot-machine.sql' }, { status: 500 })
  const p = Math.min(100, Math.max(0, Number(body.win_probability) || 0))
  const { data, error } = await supabase.from('slot_settings')
    .update({ is_active: !!body.is_active, win_probability: p, updated_at: new Date().toISOString() })
    .eq('id', current.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Premi: crea (senza id) o aggiorna (con id)
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const discount = Number(body.discount_percent)
  const label = String(body.label || '').trim()
  if (!label || !(discount > 0 && discount <= 100)) return NextResponse.json({ error: 'Nome e sconto (1-100) obbligatori' }, { status: 400 })
  const row = { label, discount_percent: discount, weight: Math.max(1, parseInt(body.weight) || 1), is_active: body.is_active ?? true }
  const supabase = createAdminClient()
  const q = body.id ? supabase.from('slot_prizes').update(row).eq('id', body.id) : supabase.from('slot_prizes').insert(row)
  const { data, error } = await q.select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('slot_prizes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
