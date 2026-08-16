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

// GET - dati pubblici dell'account (punti fedeltà, lotteria in corso, ultimi
// ordini) per un numero di telefono. Nessuna autenticazione richiesta, stesso
// principio già usato da /api/loyalty-check: non espone dati di altri clienti,
// solo quanto risulta dal numero digitato dall'utente stesso.
//
// Prima di questa route il pannello "Il mio account" (FloatingMenu) chiamava
// già /api/account-lookup ma l'endpoint non esisteva: da qui l'errore mostrato
// a ogni inserimento del numero.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone') || ''
  const digits = phone.replace(/\D/g, '')

  if (digits.length < 6) {
    return NextResponse.json({ error: 'Numero di telefono non valido' }, { status: 400 })
  }

  const normalized = normalizePhone(phone)
  const last8 = normalized.slice(-8)
  const supabase = createAdminClient()

  const [{ data: pointsRows, error: pointsError }, { data: settings }, { data: lottery }] = await Promise.all([
    supabase.from('loyalty_points').select('points, type').eq('phone_normalized', normalized),
    supabase.from('loyalty_settings').select('*').eq('is_active', true).order('updated_at', { ascending: false }).limit(1).single(),
    supabase.from('lottery').select('*').limit(1).single(),
  ])

  if (pointsError) {
    return NextResponse.json({ error: pointsError.message }, { status: 500 })
  }

  const total = Math.max(0, (pointsRows || []).reduce((s, r) => s + r.points, 0))
  const threshold = settings?.points_threshold || 10
  const rewardDescription = settings?.reward_description || 'un premio esclusivo'
  const resetCount = (pointsRows || []).filter(r => r.type === 'reset').length
  const cardsCompleted = resetCount + Math.floor(total / threshold)
  const progress = total % threshold

  // Numeri lotteria del turno in corso per questo cliente: sia quelli
  // aggiunti durante un ordine normale (colonna lottery_number su orders)
  // sia quelli comprati a parte come biglietti (tabella lottery_tickets).
  let lotteryPayload: { title: string; ends_at: string | null; numbers: number[] } | null = null
  if (lottery?.is_active && lottery.round_id) {
    const [{ data: orderTickets }, { data: standaloneTickets }] = await Promise.all([
      supabase.from('orders').select('phone_number, lottery_number')
        .eq('lottery_round', lottery.round_id).not('lottery_number', 'is', null)
        .ilike('phone_number', `%${last8}%`),
      supabase.from('lottery_tickets').select('phone_number, lottery_number')
        .eq('round_id', lottery.round_id).eq('is_reserved', false)
        .ilike('phone_number', `%${last8}%`),
    ])
    const numbers = new Set<number>()
    for (const row of [...(orderTickets || []), ...(standaloneTickets || [])]) {
      if (row.phone_number && row.lottery_number != null && normalizePhone(row.phone_number) === normalized) {
        numbers.add(row.lottery_number)
      }
    }
    lotteryPayload = { title: lottery.title, ends_at: lottery.ends_at, numbers: Array.from(numbers).sort((a, b) => a - b) }
  }

  // Ultimi ordini (solo prodotti veri, non i biglietti lotteria acquistati a parte)
  const { data: candidateOrders } = await supabase
    .from('orders')
    .select('id, status, total, created_at, phone_number, order_items(product_name, quantity, product_price)')
    .eq('is_ticket_only', false)
    .ilike('phone_number', `%${last8}%`)
    .order('created_at', { ascending: false })
    .limit(30)

  const orders = (candidateOrders || [])
    .filter(o => normalizePhone(o.phone_number) === normalized)
    .slice(0, 5)
    .map(o => ({ id: o.id, status: o.status, total: o.total, created_at: o.created_at, items: o.order_items || [] }))

  return NextResponse.json({
    points: { total, threshold, reward_description: rewardDescription, cards_completed: cardsCompleted, progress },
    lottery: lotteryPayload,
    orders,
  })
}
