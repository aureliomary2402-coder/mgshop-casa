import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

function normalizePhone(phone: string): string {
  // Rimuove spazi, trattini e prefissi internazionali comuni
  let n = phone.replace(/[\s\-\(\)\.]/g, '')
  // Rimuove prefisso +39, 0039, +1 ecc.
  n = n.replace(/^\+\d{1,3}/, '').replace(/^00\d{2}/, '')
  // Prende solo le ultime 9-10 cifre (numero italiano)
  if (n.length > 10) n = n.slice(-10)
  return n
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, phone_number, customer_name, total, status, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Raggruppa per numero normalizzato
  const clientiMap: Record<string, {
    normalized: string
    phone_number: string
    customer_name: string | null
    orders: number
    total: number
    last_order: string
    statuses: string[]
  }> = {}

  for (const order of orders || []) {
    const normalized = normalizePhone(order.phone_number)
    if (!clientiMap[normalized]) {
      clientiMap[normalized] = {
        normalized,
        phone_number: order.phone_number,
        customer_name: order.customer_name || null,
        orders: 0,
        total: 0,
        last_order: order.created_at,
        statuses: [],
      }
    }
    const c = clientiMap[normalized]
    c.orders++
    c.total += order.total || 0
    if (order.customer_name && !c.customer_name) c.customer_name = order.customer_name
    if (order.created_at > c.last_order) c.last_order = order.created_at
    c.statuses.push(order.status)
  }

  const clienti = Object.values(clientiMap).sort((a, b) => b.total - a.total)
  return NextResponse.json(clienti)
}
