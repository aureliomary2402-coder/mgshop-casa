import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

function normalizePhone(phone: string): string {
  let n = phone.replace(/\D/g, '')
  const prefixes = ['0039','0044','0033','0049','0034','001']
  for (const p of prefixes) { if (n.startsWith(p)) { n = n.slice(p.length); break } }
  if (n.startsWith('39') && n.length === 12) n = n.slice(2)
  if (n.startsWith('44') && n.length === 12) n = n.slice(2)
  if (n.startsWith('33') && n.length === 11) n = n.slice(2)
  if (n.startsWith('49') && n.length === 12) n = n.slice(2)
  if (n.startsWith('34') && n.length === 11) n = n.slice(2)
  if (n.startsWith('1') && n.length === 11) n = n.slice(1)
  if (n.length > 10) n = n.slice(-10)
  return n
}

// GET - punti di un cliente specifico
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')
  if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

  const normalized = normalizePhone(phone)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('loyalty_points')
    .select('*')
    .eq('phone_normalized', normalized)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = (data || []).reduce((s, r) => s + r.points, 0)
  return NextResponse.json({ total, history: data || [] })
}

// POST - aggiungi/togli punti
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { phone, points, note } = await request.json()
  if (!phone || points === undefined) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const normalized = normalizePhone(phone)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('loyalty_points')
    .insert({ phone_normalized: normalized, points, note: note || null })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calcola nuovo totale
  const { data: all } = await supabase.from('loyalty_points').select('points').eq('phone_normalized', normalized)
  const total = (all || []).reduce((s, r) => s + r.points, 0)

  return NextResponse.json({ success: true, record: data, total })
}
