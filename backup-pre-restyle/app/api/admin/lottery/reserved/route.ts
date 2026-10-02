import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

// Etichette usate per riconoscere i numeri "fantasma" riservati dall'admin
// nella tabella lottery_tickets (che altrimenti contiene solo biglietti
// comprati davvero dai clienti).
const RESERVED_PHONE = 'admin-riservato'
const RESERVED_NAME = 'Riservato'

// Stato completo dei numeri del turno attuale, diviso in tre gruppi:
// - venduti davvero (ordini con +1€ o biglietti a parte comprati da clienti)
// - riservati dall'admin (numeri fantasma: occupano lo slot ma non contano
//   come vendita né come incasso)
// - il totale dei posti (participants_count), da cui si ricavano i liberi
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()

  const { data: lottery } = await supabase.from('lottery').select('round_id, participants_count').limit(1).single()
  if (!lottery?.round_id) return NextResponse.json({ participants_count: 0, sold_numbers: [], reserved_numbers: [] })

  const [{ data: orderNums, error: ordersError }, { data: tickets, error: ticketsError }] = await Promise.all([
    supabase.from('orders').select('lottery_number').eq('lottery_round', lottery.round_id).not('lottery_number', 'is', null),
    supabase.from('lottery_tickets').select('lottery_number, is_reserved').eq('round_id', lottery.round_id),
  ])
  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 })
  if (ticketsError) return NextResponse.json({ error: ticketsError.message }, { status: 500 })

  const soldNumbers = new Set<number>()
  for (const row of orderNums || []) if (row.lottery_number != null) soldNumbers.add(row.lottery_number)
  for (const t of tickets || []) if (!t.is_reserved) soldNumbers.add(t.lottery_number)

  const reservedNumbers = (tickets || []).filter(t => t.is_reserved).map(t => t.lottery_number).sort((a, b) => a - b)

  return NextResponse.json({
    participants_count: lottery.participants_count,
    sold_numbers: Array.from(soldNumbers).sort((a, b) => a - b),
    reserved_numbers: reservedNumbers,
  })
}

// Riserva un numero per l'admin: crea un biglietto "fantasma", non collegato
// a nessun ordine, che occupa lo slot (i clienti non potranno più sceglierlo
// né riceverlo in automatico) ma non compare tra i biglietti venduti né
// genera incasso.
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const number = parseInt(body.number)
  if (!number || number < 1) return NextResponse.json({ error: 'Numero non valido' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: lottery } = await supabase.from('lottery').select('round_id, participants_count').limit(1).single()
  if (!lottery?.round_id) return NextResponse.json({ error: 'Nessuna lotteria attiva' }, { status: 400 })
  if (number > lottery.participants_count) return NextResponse.json({ error: 'Numero fuori dal range dei partecipanti' }, { status: 400 })

  const { error } = await supabase.from('lottery_tickets').insert({
    round_id: lottery.round_id,
    lottery_number: number,
    phone_number: RESERVED_PHONE,
    customer_name: RESERVED_NAME,
    is_reserved: true,
    order_id: null,
  })

  if (error) {
    // Violazione del vincolo unico (round_id, lottery_number): il numero è
    // già preso, da un cliente o da un'altra riserva.
    if (error.code === '23505') return NextResponse.json({ error: 'Questo numero è già occupato' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

// Libera un numero riservato dall'admin, rendendolo di nuovo disponibile.
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const number = parseInt(body.number)
  if (!number) return NextResponse.json({ error: 'Numero non valido' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: lottery } = await supabase.from('lottery').select('round_id').limit(1).single()
  if (!lottery?.round_id) return NextResponse.json({ error: 'Nessuna lotteria attiva' }, { status: 400 })

  const { error } = await supabase.from('lottery_tickets')
    .delete()
    .eq('round_id', lottery.round_id)
    .eq('lottery_number', number)
    .eq('is_reserved', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
