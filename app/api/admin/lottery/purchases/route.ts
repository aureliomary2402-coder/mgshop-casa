import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

// Ordini che contengono SOLO biglietti della lotteria (nessun prodotto vero):
// vivono qui, separati dagli ordini normali, con i numeri assegnati a ciascuno.
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, phone_number, customer_name, total, status, created_at')
    .eq('is_ticket_only', true)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!orders || orders.length === 0) return NextResponse.json([])

  const orderIds = orders.map(o => o.id)
  const { data: tickets } = await supabase
    .from('lottery_tickets')
    .select('order_id, lottery_number')
    .in('order_id', orderIds)

  const numbersByOrder: Record<string, number[]> = {}
  for (const t of tickets || []) {
    if (!numbersByOrder[t.order_id]) numbersByOrder[t.order_id] = []
    numbersByOrder[t.order_id].push(t.lottery_number)
  }

  const result = orders.map(o => ({
    ...o,
    numbers: (numbersByOrder[o.id] || []).sort((a, b) => a - b),
  }))

  return NextResponse.json(result)
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()

  const updateData: Record<string, string> = {}
  if (body.status !== undefined) updateData.status = body.status
  if (body.customer_name !== undefined) updateData.customer_name = body.customer_name

  const { data, error } = await supabase.from('orders').update(updateData).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  const supabase = createAdminClient()
  // Elimina l'ordine: i biglietti collegati vengono rimossi in automatico
  // grazie al vincolo "on delete cascade" sulla tabella lottery_tickets.
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
