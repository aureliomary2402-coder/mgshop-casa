import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoArchiveIfExpired } from '@/lib/lottery'
import { LOTTERY_TICKET_PRODUCT_ID } from '@/lib/lottery-ticket-product'

export async function POST(request: NextRequest) {
  try {
    const { phone_number, items, total, coupon_code } = await request.json()
    if (!phone_number || !items || items.length === 0)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const supabase = createAdminClient()

    // Il "biglietto lotteria" è una voce speciale nel carrello: non è un
    // prodotto vero (niente magazzino, niente riga in order_items). Che il
    // cliente compri solo biglietti o li aggiunga insieme ad altri prodotti,
    // il meccanismo di assegnazione dei numeri è sempre lo stesso.
    const ticketItem = items.find((i: { product: { id: string } }) => i.product.id === LOTTERY_TICKET_PRODUCT_ID)
    const ticketQty = ticketItem ? Math.max(0, parseInt(ticketItem.quantity) || 0) : 0
    const realItems = items.filter((i: { product: { id: string } }) => i.product.id !== LOTTERY_TICKET_PRODUCT_ID)

    let lottery: any = null
    if (ticketQty > 0) {
      const { data: lotteryRow } = await supabase.from('lottery').select('*').limit(1).single()
      lottery = lotteryRow ? await autoArchiveIfExpired(supabase, lotteryRow) : null
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ phone_number, total, status: 'pending' })
      .select().single()
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

    let ticketNumbers: number[] = []
    if (ticketQty > 0 && lottery?.is_active && lottery.round_id) {
      const [{ count: orderCount }, { count: existingTicketCount }] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .eq('lottery_round', lottery.round_id).not('lottery_number', 'is', null),
        supabase.from('lottery_tickets').select('id', { count: 'exact', head: true })
          .eq('round_id', lottery.round_id),
      ])
      const start = (orderCount || 0) + (existingTicketCount || 0) + 1
      ticketNumbers = Array.from({ length: ticketQty }, (_, i) => start + i)
      await supabase.from('lottery_tickets').insert(
        ticketNumbers.map(n => ({
          round_id: lottery.round_id,
          lottery_number: n,
          order_id: order.id,
          phone_number,
        }))
      )
    }

    if (realItems.length > 0) {
      const orderItems = realItems.map((item: { product: { id: string; name: string; price: number }; quantity: number }) => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
      }))
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

      // Scala le quantità dal magazzino (solo per i prodotti veri)
      for (const item of realItems) {
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product.id)
          .single()
        if (product && product.stock !== null) {
          const newStock = Math.max(0, product.stock - item.quantity)
          await supabase.from('products').update({ stock: newStock }).eq('id', item.product.id)
        }
      }
    }

    if (coupon_code) {
      const { data: coupon } = await supabase.from('coupons').select('id, uses_count').eq('code', coupon_code).single()
      if (coupon) await supabase.from('coupons').update({ uses_count: coupon.uses_count + 1 }).eq('id', coupon.id)
    }

    // Notifica push
    const itemsCount = realItems.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)
    const notifBody = ticketQty > 0
      ? `${phone_number} — ${itemsCount} articoli + ${ticketQty} bigliett${ticketQty > 1 ? 'i' : 'o'} lotteria — €${total.toFixed(2)}`
      : `${phone_number} — ${itemsCount} articoli — €${total.toFixed(2)}`
    const baseUrl = request.headers.get('origin') || 'https://mgshop-2.vercel.app'
    fetch(`${baseUrl}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Nuovo ordine ricevuto!',
        body: notifBody,
        url: '/mgadmin-panel'
      })
    }).catch(() => {})

    return NextResponse.json({ success: true, order, ticket_numbers: ticketNumbers })
  } catch {
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
