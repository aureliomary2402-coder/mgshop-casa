import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { sendPushToAdmin } from '@/lib/push'
import { syncStockOnStatusChange } from '@/lib/stock'

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

  // Se un ordine non ha ancora un nome cliente, controlliamo se quel numero
  // di telefono ha già ordinato in passato (con qualsiasi tipo di ordine,
  // anche solo biglietti lotteria) e in tal caso riusiamo lo stesso nome:
  // così l'admin non deve reinserirlo ogni volta per lo stesso cliente.
  const missingNameIds = (data || []).filter((o: { customer_name?: string | null }) => !o.customer_name).map((o: { id: string }) => o.id)
  if (missingNameIds.length > 0) {
    const { data: namedOrders } = await supabase
      .from('orders')
      .select('phone_number, customer_name, created_at')
      .not('customer_name', 'is', null)
      .order('created_at', { ascending: false })
    const nameByPhone: Record<string, string> = {}
    for (const o of namedOrders || []) {
      const key = normalizePhone(o.phone_number)
      if (key && !nameByPhone[key] && o.customer_name) nameByPhone[key] = o.customer_name
    }
    const toPersist: { id: string; name: string }[] = []
    for (const o of data || []) {
      if (!o.customer_name) {
        const matched = nameByPhone[normalizePhone(o.phone_number)]
        if (matched) { o.customer_name = matched; toPersist.push({ id: o.id, name: matched }) }
      }
    }
    if (toPersist.length > 0) {
      await Promise.all(toPersist.map(({ id, name }) =>
        supabase.from('orders').update({ customer_name: name }).eq('id', id)
      )).catch(() => {})
    }
  }

  // Alcuni di questi ordini hanno anche biglietti lotteria acquistati insieme
  // ai prodotti: quell'incasso non va contato come incasso "prodotti",
  // altrimenti l'incasso ordini risulta gonfiato. Qui calcoliamo quanti
  // biglietti (e quanti € — al prezzo pagato davvero, non per forza €1) ha
  // ciascun ordine.
  const orderIds = (data || []).map((o: { id: string }) => o.id)
  const ticketCounts: Record<string, number> = {}
  const ticketRevenue: Record<string, number> = {}
  if (orderIds.length > 0) {
    const { data: tickets } = await supabase.from('lottery_tickets').select('order_id, price').in('order_id', orderIds)
    for (const t of tickets || []) {
      ticketCounts[t.order_id] = (ticketCounts[t.order_id] || 0) + 1
      ticketRevenue[t.order_id] = (ticketRevenue[t.order_id] || 0) + Number(t.price ?? 1)
    }
  }
  // Stock attuale di tutti i prodotti presenti negli ordini: serve al
  // pannello per segnalare riga per riga se il prodotto è già in magazzino
  // o va acquistato, confrontando quantità ordinata e stock disponibile ora.
  const productIds = Array.from(new Set(
    (data || []).flatMap((o: { order_items?: { product_id: string | null }[] }) =>
      (o.order_items || []).map(i => i.product_id).filter((id): id is string => !!id))
  ))
  const stockByProduct: Record<string, number | null> = {}
  if (productIds.length > 0) {
    const { data: productsData } = await supabase.from('products').select('id, stock').in('id', productIds)
    for (const p of productsData || []) stockByProduct[p.id] = p.stock
  }

  const withTicketInfo = (data || []).map((o: { id: string; order_items?: { product_id: string | null }[] }) => ({
    ...o,
    ticket_count: ticketCounts[o.id] || 0,
    ticket_revenue: ticketRevenue[o.id] || 0,
    order_items: (o.order_items || []).map(i => ({
      ...i,
      current_stock: i.product_id !== null ? (stockByProduct[i.product_id] ?? null) : null,
    })),
  }))
  return NextResponse.json(withTicketInfo)
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()

  // Leggo lo stato precedente prima di aggiornare, per sapere se sto per assegnare punti nuovi
  // e per capire se il magazzino va scalato o ripristinato in base al cambio di stato.
  const { data: before } = await supabase.from('orders').select('status').eq('id', body.id).single()
  const wasAlreadyDelivered = before?.status === 'delivered'
  const previousStatus = before?.status

  const updateData: Record<string, string> = {}
  if (body.status !== undefined) updateData.status = body.status
  if (body.customer_name !== undefined) updateData.customer_name = body.customer_name
  const { data, error } = await supabase.from('orders').update(updateData).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Scala il magazzino quando l'ordine viene confermato (o passa direttamente
  // a spedito/consegnato), e lo ripristina se torna in attesa o viene annullato.
  if (updateData.status !== undefined) {
    await syncStockOnStatusChange(supabase, body.id, previousStatus, updateData.status)
  }

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
