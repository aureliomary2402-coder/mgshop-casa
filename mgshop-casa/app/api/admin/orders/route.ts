import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { sendPushToAdmin } from '@/lib/push'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

function normalizePhone(phone: string): string {
  let n = phone.replace(/\D/g, '')
  const prefixes = ['0039', '0044', '0033', '0049', '0034', '001']
  for (const p of prefixes) {
    if (n.startsWith(p)) { n = n.slice(p.length); break }
  }
  if (n.startsWith('39') && n.length === 12) n = n.slice(2)
  if (n.startsWith('44') && n.length === 12) n = n.slice(2)
  if (n.startsWith('33') && n.length === 11) n = n.slice(2)
  if (n.startsWith('49') && n.length === 12) n = n.slice(2)
  if (n.startsWith('34') && n.length === 11) n = n.slice(2)
  if (n.startsWith('1') && n.length === 11) n = n.slice(1)
  if (n.length > 10) n = n.slice(-10)
  return n
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('is_ticket_only', false)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Alcuni di questi ordini hanno anche biglietti lotteria acquistati insieme
  // ai prodotti: quei €1 a biglietto non vanno contati come incasso "prodotti",
  // altrimenti l'incasso ordini risulta gonfiato. Qui calcoliamo quanti
  // biglietti (e quindi quanti € di biglietti) ha ciascun ordine.
  const orderIds = (data || []).map((o: { id: string }) => o.id)
  const ticketCounts: Record<string, number> = {}
  if (orderIds.length > 0) {
    const { data: tickets } = await supabase.from('lottery_tickets').select('order_id').in('order_id', orderIds)
    for (const t of tickets || []) {
      ticketCounts[t.order_id] = (ticketCounts[t.order_id] || 0) + 1
    }
  }
  const withTicketInfo = (data || []).map((o: { id: string }) => ({
    ...o,
    ticket_count: ticketCounts[o.id] || 0,
  }))
  return NextResponse.json(withTicketInfo)
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()

  // Leggo lo stato precedente prima di aggiornare, per sapere se sto per assegnare punti nuovi
  const { data: before } = await supabase.from('orders').select('status').eq('id', body.id).single()
  const wasAlreadyDelivered = before?.status === 'delivered'

  const updateData: Record<string, string> = {}
  if (body.status !== undefined) updateData.status = body.status
  if (body.customer_name !== undefined) updateData.customer_name = body.customer_name
  const { data, error } = await supabase.from('orders').update(updateData).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Il trigger DB che assegna i punti gira DOPO questo update (in una scrittura separata sulla riga),
  // quindi "data.points_earned" qui sopra è ancora quello vecchio: rileggo l'ordine per prendere il valore aggiornato
  let pointsJustAwarded = 0
  if (updateData.status === 'delivered' && !wasAlreadyDelivered) {
    const { data: refreshed } = await supabase.from('orders').select('points_earned').eq('id', body.id).single()
    pointsJustAwarded = refreshed?.points_earned || 0
  }

  // Se l'ordine è appena passato a "delivered" ORA (non lo era già), il trigger del DB ha assegnato i punti:
  // avviso subito l'admin di quanti punti sono stati dati per questo ordine
  if (updateData.status === 'delivered' && !wasAlreadyDelivered && pointsJustAwarded > 0) {
    try {
      await sendPushToAdmin(
        '🎁 Punti fedeltà assegnati',
        `${data.customer_name || data.phone_number}: +${pointsJustAwarded} punti per l'ordine da €${Number(data.total).toFixed(2)}`,
        '/mgadmin-panel'
      )
    } catch (e) {
      console.error('Notifica punti assegnati fallita:', e)
    }
  }

  // Se l'ordine è appena passato a "delivered", controlla se il cliente ha raggiunto la soglia punti fedeltà
  if (updateData.status === 'delivered' && data?.phone_number) {
    try {
      const normalized = normalizePhone(data.phone_number)

      const { data: pointsRows } = await supabase
        .from('loyalty_points')
        .select('points')
        .eq('phone_normalized', normalized)
      const total = (pointsRows || []).reduce((s, r) => s + (r.points || 0), 0)

      const { data: settingsRows } = await supabase
        .from('loyalty_settings')
        .select('points_threshold')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
      const threshold = settingsRows?.[0]?.points_threshold ?? 10

      if (total >= threshold) {
        await sendPushToAdmin(
          '🎁 Cliente pronto per il premio',
          `${data.customer_name || data.phone_number} ha raggiunto ${total} punti fedeltà`,
          '/mgadmin-panel'
        )
      }
    } catch (e) {
      console.error('Notifica soglia punti fallita:', e)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
