import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Tutto quello che è stato ordinato (prodotti e/o biglietti lotteria) ma non
// è ancora stato consegnato/incassato: sia gli ordini normali sia quelli di
// soli biglietti finiscono nella stessa tabella "orders", quindi basta
// escludere chi è già "delivered" o "cancelled". Ordinati dal più vecchio
// al più recente, così quelli in sospeso da più tempo saltano subito
// all'occhio.
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, phone_number, customer_name, total, status, created_at, is_ticket_only, order_items(product_name, quantity)')
    .in('status', ['pending', 'confirmed', 'shipped'])
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orderIds = (orders || []).map(o => o.id)
  const { data: tickets } = orderIds.length > 0
    ? await supabase.from('lottery_tickets').select('order_id, lottery_number').in('order_id', orderIds).eq('is_reserved', false)
    : { data: [] as { order_id: string; lottery_number: number }[] }

  const ticketsByOrder: Record<string, number[]> = {}
  for (const t of tickets || []) {
    if (!t.order_id) continue
    ;(ticketsByOrder[t.order_id] ||= []).push(t.lottery_number)
  }

  const pending = (orders || []).map(o => ({
    id: o.id,
    phone_number: o.phone_number,
    customer_name: o.customer_name,
    total: o.total,
    status: o.status,
    created_at: o.created_at,
    is_ticket_only: o.is_ticket_only,
    items: (o.order_items || []).map((i: { product_name: string; quantity: number }) => ({ name: i.product_name, quantity: i.quantity })),
    lottery_numbers: (ticketsByOrder[o.id] || []).sort((a, b) => a - b),
  }))

  return NextResponse.json({ pending })
}
