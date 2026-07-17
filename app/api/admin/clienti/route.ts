import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

function normalizePhone(phone: string): string {
  // Rimuove tutto tranne le cifre
  let n = phone.replace(/\D/g, '')
  // Rimuove prefissi comuni: 39 (Italia), 1 (USA), 44 (UK), 33 (FR), 49 (DE), 34 (ES)
  const prefixes = ['0039', '0044', '0033', '0049', '0034', '001']
  for (const p of prefixes) {
    if (n.startsWith(p)) { n = n.slice(p.length); break }
  }
  // Rimuove +39, +1 ecc (già solo cifre quindi 39, 1, 44...)
  if (n.startsWith('39') && n.length === 12) n = n.slice(2)
  if (n.startsWith('44') && n.length === 12) n = n.slice(2)
  if (n.startsWith('33') && n.length === 11) n = n.slice(2)
  if (n.startsWith('49') && n.length === 12) n = n.slice(2)
  if (n.startsWith('34') && n.length === 11) n = n.slice(2)
  if (n.startsWith('1') && n.length === 11) n = n.slice(1)
  // Prende le ultime 9-10 cifre come chiave univoca
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
    // Preferisce il numero più recente e il nome se disponibile
    if (order.customer_name && !c.customer_name) c.customer_name = order.customer_name
    if (order.created_at > c.last_order) {
      c.last_order = order.created_at
      c.phone_number = order.phone_number // usa il numero più recente
    }
    c.statuses.push(order.status)
  }

  // Aggiunge saldo punti fedeltà e stato "pronto premio"
  const { data: loyaltyRows } = await supabase.from('loyalty_points').select('phone_normalized, points')
  const { data: settingsRows } = await supabase
    .from('loyalty_settings').select('points_threshold').eq('is_active', true)
    .order('updated_at', { ascending: false }).limit(1)
  const threshold = settingsRows?.[0]?.points_threshold ?? 10

  const pointsMap: Record<string, number> = {}
  for (const r of loyaltyRows || []) {
    pointsMap[r.phone_normalized] = (pointsMap[r.phone_normalized] || 0) + r.points
  }

  const clienti = Object.values(clientiMap).map(c => ({
    ...c,
    loyaltyPoints: pointsMap[c.normalized] || 0,
    loyaltyReady: (pointsMap[c.normalized] || 0) >= threshold,
  })).sort((a, b) => b.total - a.total)

  return NextResponse.json(clienti)
}
