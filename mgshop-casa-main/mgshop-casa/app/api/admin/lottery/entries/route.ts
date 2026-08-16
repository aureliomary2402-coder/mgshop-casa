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
      .select('id, order_id, phone_number, customer_name, lottery_number, created_at')
      .eq('round_id', lottery.round_id)
      .eq('is_reserved', false),
  ])

  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 })
  if (ticketsError) return NextResponse.json({ error: ticketsError.message }, { status: 500 })

  // Il nome di un biglietto vive sull'ordine collegato (stessa fonte usata
  // dalla tab Ordini e dalla tab Biglietti), non più su una copia separata
  // nella riga del biglietto: così rinominare in un punto qualsiasi si
  // riflette automaticamente ovunque, senza dover ripetere la modifica.
  const ticketOrderIds = Array.from(new Set((ticketEntries || []).map(t => t.order_id).filter(Boolean))) as string[]
  const { data: ticketOrders } = ticketOrderIds.length > 0
    ? await supabase.from('orders').select('id, customer_name').in('id', ticketOrderIds)
    : { data: [] as { id: string; customer_name: string | null }[] }
  const ticketOrderNameById = Object.fromEntries((ticketOrders || []).map(o => [o.id, o.customer_name]))

  const entries = [
    ...(orderEntries || []).map(e => ({ ...e, source: 'order' as const })),
    ...(ticketEntries || []).map(e => ({
      ...e,
      customer_name: e.order_id ? (ticketOrderNameById[e.order_id] ?? null) : e.customer_name,
      source: 'ticket' as const,
    })),
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
  const cleanName = (body.customer_name || '').trim() || null

  if (body.source === 'ticket') {
    // Il biglietto quasi sempre ha un ordine collegato (anche se comprato
    // da solo, senza altri prodotti): rinominiamo lì, così la modifica
    // compare automaticamente anche nella tab Ordini/Biglietti e nella
    // sezione "Da consegnare e incassare", senza doverla ripetere in 3 posti.
    const { data: ticket } = await supabase.from('lottery_tickets').select('order_id').eq('id', body.id).single()
    if (ticket?.order_id) {
      const { error } = await supabase.from('orders').update({ customer_name: cleanName }).eq('id', ticket.order_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const { data: full } = await supabase.from('lottery_tickets')
        .select('id, order_id, phone_number, lottery_number, created_at')
        .eq('id', body.id).single()
      return NextResponse.json({ entry: { ...full, customer_name: cleanName, source: 'ticket' } })
    }
    // Nessun ordine collegato (caso raro/dati storici): aggiorniamo il biglietto stesso.
    const { data, error } = await supabase.from('lottery_tickets')
      .update({ customer_name: cleanName })
      .eq('id', body.id)
      .select('id, phone_number, customer_name, lottery_number, created_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ entry: { ...data, source: 'ticket' } })
  }

  const { data, error } = await supabase.from('orders')
    .update({ customer_name: cleanName })
    .eq('id', body.id)
    .select('id, phone_number, customer_name, lottery_number, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: { ...data, source: 'order' } })
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
