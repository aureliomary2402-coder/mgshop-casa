import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Elenco di chi partecipa al turno attuale della lotteria: sia chi ha
// spuntato "+1€" durante un acquisto normale (righe nella tabella orders),
// sia chi ha comprato biglietti a parte senza acquistare altro (righe nella
// tabella lottery_tickets). Le due liste vengono unite e ordinate per numero.
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()

  const { data: lottery } = await supabase.from('lottery').select('round_id').limit(1).single()
  if (!lottery?.round_id) return NextResponse.json({ entries: [] })

  const [{ data: orderEntries, error: ordersError }, { data: ticketEntries, error: ticketsError }] = await Promise.all([
    supabase.from('orders')
      .select('id, phone_number, customer_name, lottery_number, created_at')
      .eq('lottery_round', lottery.round_id)
      .not('lottery_number', 'is', null),
    supabase.from('lottery_tickets')
      .select('id, phone_number, customer_name, lottery_number, created_at')
      .eq('round_id', lottery.round_id),
  ])

  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 })
  if (ticketsError) return NextResponse.json({ error: ticketsError.message }, { status: 500 })

  const entries = [
    ...(orderEntries || []).map(e => ({ ...e, source: 'order' as const })),
    ...(ticketEntries || []).map(e => ({ ...e, source: 'ticket' as const })),
  ].sort((a, b) => a.lottery_number - b.lottery_number)

  return NextResponse.json({ entries })
}

// Rinomina un partecipante (es. quando si scopre il nome del cliente,
// come si fa già per gli ordini normali). "source" dice se il numero viene
// da un ordine normale o da un biglietto acquistato a parte.
export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  const supabase = createAdminClient()
  const table = body.source === 'ticket' ? 'lottery_tickets' : 'orders'
  const { data, error } = await supabase.from(table)
    .update({ customer_name: (body.customer_name || '').trim() || null })
    .eq('id', body.id)
    .select('id, phone_number, customer_name, lottery_number, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: { ...data, source: body.source === 'ticket' ? 'ticket' : 'order' } })
}

// Rimuove un partecipante dal turno attuale. Se veniva da un ordine normale,
// l'ordine resta salvato e viene solo scollegato dalla lotteria; se veniva
// da un biglietto acquistato a parte, il biglietto viene eliminato del tutto.
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  const supabase = createAdminClient()

  if (body.source === 'ticket') {
    const { error } = await supabase.from('lottery_tickets').delete().eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('orders')
      .update({ lottery_number: null, lottery_round: null })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
