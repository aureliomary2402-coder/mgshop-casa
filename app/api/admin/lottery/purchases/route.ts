import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

// Ogni biglietto lotteria venduto compare qui, sia che sia stato acquistato
// da solo (nessun prodotto) sia che sia stato preso insieme ad altri
// prodotti in un ordine normale. I biglietti presi insieme a un ordine
// restano visibili anche nella tab Ordini (perché l'ordine è reale), ma qui
// vengono comunque conteggiati come biglietti, non come incasso prodotti.
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()

  const { data: tickets, error } = await supabase
    .from('lottery_tickets')
    .select('id, order_id, lottery_number, phone_number, customer_name, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!tickets || tickets.length === 0) return NextResponse.json([])

  const orderIds = Array.from(new Set(tickets.map(t => t.order_id).filter(Boolean))) as string[]
  const { data: orders } = orderIds.length > 0
    ? await supabase.from('orders').select('id, status, is_ticket_only, customer_name').in('id', orderIds)
    : { data: [] as any[] }
  const orderById = Object.fromEntries((orders || []).map((o: any) => [o.id, o]))

  // Raggruppo per ordine (o per singolo biglietto, se per qualche motivo
  // non è collegato a un ordine) così un acquisto di più numeri insieme
  // compare come una riga sola con tutti i suoi numeri.
  const groups: Record<string, { order_id: string | null; phone_number: string; customer_name: string | null; created_at: string; numbers: number[]; bundled_with_products: boolean; status: string }> = {}

  for (const t of tickets) {
    const key = t.order_id || `standalone-${t.id}`
    const order = t.order_id ? orderById[t.order_id] : null
    if (!groups[key]) {
      groups[key] = {
        order_id: t.order_id,
        phone_number: t.phone_number,
        customer_name: order?.customer_name ?? t.customer_name,
        created_at: t.created_at,
        numbers: [],
        bundled_with_products: order ? !order.is_ticket_only : false,
        status: order?.status || 'pending',
      }
    }
    groups[key].numbers.push(t.lottery_number)
  }

  const result = Object.entries(groups).map(([key, g]) => ({ id: key, ...g, numbers: g.numbers.sort((a, b) => a - b) }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json(result)
}

// Rinomina/aggiorna stato: valido solo per acquisti di soli biglietti
// (senza altri prodotti) — quelli presi insieme a un ordine si gestiscono
// dalla tab Ordini, per evitare di modificare l'ordine da due posti diversi.
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.order_id) return NextResponse.json({ error: 'Questo biglietto è collegato a un ordine con altri prodotti: gestiscilo dalla tab Ordini' }, { status: 400 })
  const supabase = createAdminClient()

  const { data: order } = await supabase.from('orders').select('is_ticket_only').eq('id', body.order_id).single()
  if (!order?.is_ticket_only) return NextResponse.json({ error: 'Questo biglietto è collegato a un ordine con altri prodotti: gestiscilo dalla tab Ordini' }, { status: 400 })

  const updateData: Record<string, string> = {}
  if (body.status !== undefined) updateData.status = body.status
  if (body.customer_name !== undefined) updateData.customer_name = body.customer_name

  const { data, error } = await supabase.from('orders').update(updateData).eq('id', body.order_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { order_id } = await request.json()
  if (!order_id) return NextResponse.json({ error: 'Questo biglietto è collegato a un ordine con altri prodotti: gestiscilo dalla tab Ordini' }, { status: 400 })
  const supabase = createAdminClient()

  const { data: order } = await supabase.from('orders').select('is_ticket_only').eq('id', order_id).single()
  if (!order?.is_ticket_only) return NextResponse.json({ error: 'Questo biglietto è collegato a un ordine con altri prodotti: gestiscilo dalla tab Ordini' }, { status: 400 })

  // Elimina l'ordine: i biglietti collegati vengono rimossi in automatico
  // grazie al vincolo "on delete cascade" sulla tabella lottery_tickets.
  const { error } = await supabase.from('orders').delete().eq('id', order_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
