import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoArchiveIfExpired } from '@/lib/lottery'

export async function POST(request: NextRequest) {
  try {
    const { phone_number, customer_name, quantity } = await request.json()
    const phone = (phone_number || '').trim()
    const qty = Math.min(20, Math.max(1, parseInt(quantity) || 1))

    if (!phone) return NextResponse.json({ error: 'Numero di telefono mancante' }, { status: 400 })

    const supabase = createAdminClient()
    let { data: lottery } = await supabase.from('lottery').select('*').limit(1).single()
    if (lottery) lottery = await autoArchiveIfExpired(supabase, lottery)

    if (!lottery?.is_active || !lottery.round_id) {
      return NextResponse.json({ error: 'La lotteria non è più attiva' }, { status: 400 })
    }

    // Il numero progressivo tiene conto sia dei biglietti acquistati qui,
    // sia dei numeri già assegnati con l'opt-in +1€ al checkout normale.
    const [{ count: orderCount }, { count: ticketCount }] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('lottery_round', lottery.round_id).not('lottery_number', 'is', null),
      supabase.from('lottery_tickets').select('id', { count: 'exact', head: true })
        .eq('round_id', lottery.round_id),
    ])

    const start = (orderCount || 0) + (ticketCount || 0) + 1
    const numbers = Array.from({ length: qty }, (_, i) => start + i)

    const { data: inserted, error } = await supabase.from('lottery_tickets').insert(
      numbers.map(n => ({
        round_id: lottery.round_id,
        lottery_number: n,
        phone_number: phone,
        customer_name: (customer_name || '').trim() || null,
      }))
    ).select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notifica push all'admin, come per i nuovi ordini
    const baseUrl = request.headers.get('origin') || 'https://mgshop-2.vercel.app'
    fetch(`${baseUrl}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Biglietti lotteria acquistati!',
        body: `${phone} — ${qty} biglietto${qty > 1 ? 'i' : ''} — €${qty.toFixed(2)}`,
        url: '/mgadmin-panel',
      }),
    }).catch(() => {})

    return NextResponse.json({ success: true, numbers, tickets: inserted })
  } catch {
    return NextResponse.json({ error: 'Acquisto biglietti non riuscito' }, { status: 500 })
  }
}
