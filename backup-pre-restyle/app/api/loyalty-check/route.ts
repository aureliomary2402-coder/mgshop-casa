import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function normalizePhone(phone: string): string {
  let n = phone.replace(/\D/g, '')
  const prefixes = ['0039', '0044', '0033', '0049', '0034', '001']
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

// GET - saldo punti pubblico per un numero di telefono (nessun dato sensibile restituito)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone') || ''
  const digits = phone.replace(/\D/g, '')

  if (digits.length < 6) {
    return NextResponse.json({ error: 'Numero di telefono non valido' }, { status: 400 })
  }

  const normalized = normalizePhone(phone)
  const supabase = createAdminClient()

  const [{ data: points, error: pointsError }, { data: settings }] = await Promise.all([
    supabase.from('loyalty_points').select('points, type').eq('phone_normalized', normalized),
    supabase.from('loyalty_settings').select('*').eq('is_active', true).order('updated_at', { ascending: false }).limit(1).single(),
  ])

  if (pointsError) {
    return NextResponse.json({ error: pointsError.message }, { status: 500 })
  }

  const total = Math.max(0, (points || []).reduce((s, r) => s + r.points, 0))
  const threshold = settings?.points_threshold || 10
  const rewardDescription = settings?.reward_description || 'un premio esclusivo'
  // Le schede completate contano gli azzeramenti fatti in passato dall'admin
  // (persistenti anche dopo il reset) + eventuale scheda già piena non ancora azzerata.
  const resetCount = (points || []).filter(r => r.type === 'reset').length
  const cardsCompleted = resetCount + Math.floor(total / threshold)
  const progress = total % threshold

  return NextResponse.json({
    total,
    threshold,
    reward_description: rewardDescription,
    cards_completed: cardsCompleted,
    progress,
  })
}
