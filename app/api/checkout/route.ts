import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { phone_number, items, total, coupon_code, lottery_entry } = await request.json()
    if (!phone_number || !items || items.length === 0)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const supabase = createAdminClient()

    // Se il cliente ha scelto di partecipare alla lotteria, gli assegniamo il
    // prossimo numero libero nel turno corrente — ma solo se la lotteria
    // risulta ancora davvero attiva (evita numeri assegnati a lotteria chiusa).
    let lotteryNumber: number | null = null
    let lotteryRound: string | null = null
    if (lottery_entry) {
      const { data: lottery } = await supabase.from('lottery').select('id, is_active, round_id').limit(1).single()
      if (lottery?.is_active && lottery.round_id) {
        lotteryRound = lottery.round_id
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('lottery_round', lottery.round_id)
          .not('lottery_number', 'is', null)
        lotteryNumber = (count || 0) + 1
      }
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ phone_number, total, status: 'pending', lottery_round: lotteryRound, lottery_number: lotteryNumber })
      .select().single()
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

    const orderItems = items.map((item: { product: { id: string; name: string; price: number }; quantity: number }) => ({
      order_id: order.id,
      product_id: item.product.id,
      product_name: item.product.name,
      product_price: item.product.price,
      quantity: item.quantity,
    }))
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

    // Scala le quantità dal magazzino
    for (const item of items) {
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

    if (coupon_code) {
      const { data: coupon } = await supabase.from('coupons').select('id, uses_count').eq('code', coupon_code).single()
      if (coupon) await supabase.from('coupons').update({ uses_count: coupon.uses_count + 1 }).eq('id', coupon.id)
    }

    // Notifica push
    const itemsCount = items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)
    const baseUrl = request.headers.get('origin') || 'https://mgshop-2.vercel.app'
    fetch(`${baseUrl}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Nuovo ordine ricevuto!',
        body: `${phone_number} — ${itemsCount} articoli — €${total.toFixed(2)}`,
        url: '/mgadmin-panel'
      })
    }).catch(() => {})

    return NextResponse.json({ success: true, order, lottery_number: lotteryNumber })
  } catch {
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
