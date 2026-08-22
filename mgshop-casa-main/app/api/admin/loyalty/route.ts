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
  const [{ data, error }, { data: settings }] = await Promise.all([
    supabase.from('loyalty_points').select('*').eq('phone_normalized', normalized).order('created_at', { ascending: false }),
    supabase.from('loyalty_settings').select('points_threshold').eq('is_active', true).order('updated_at', { ascending: false }).limit(1).single(),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = Math.max(0, (data || []).reduce((s, r) => s + r.points, 0))
  const threshold = settings?.points_threshold || 10
  // Le schede completate contano gli azzeramenti fatti in passato (persistenti anche
  // dopo il reset) + eventuale scheda già piena non ancora azzerata.
  const resetCount = (data || []).filter(r => r.type === 'reset').length
  const completedCount = resetCount + Math.floor(total / threshold)

  return NextResponse.json({ total, history: data || [], threshold, completedCount })
}

// POST - aggiungi/togli punti, oppure azzera la scheda (reset: true)
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { phone, points, note, reset } = body
  if (!phone) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const normalized = normalizePhone(phone)
  const supabase = createAdminClient()

  if (reset) {
    const { data: all } = await supabase.from('loyalty_points').select('points').eq('phone_normalized', normalized)
    const currentTotal = (all || []).reduce((s, r) => s + r.points, 0)
    if (currentTotal === 0) return NextResponse.json({ success: true, total: 0 })

    const { error: resetError } = await supabase
      .from('loyalty_points')
      .insert({ phone_normalized: normalized, points: -currentTotal, note: 'Scheda completata - punti azzerati', type: 'reset' })

    if (resetError) return NextResponse.json({ error: resetError.message }, { status: 500 })
    return NextResponse.json({ success: true, total: 0 })
  }

  if (points === undefined) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

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
