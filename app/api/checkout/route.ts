import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { phone_number, items, total } = await request.json()
    if (!phone_number || !items || items.length === 0)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const supabase = createAdminClient()
    const { data: order, error: orderError } = await supabase
      .from('orders').insert({ phone_number, total, status: 'pending' }).select().single()
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

    return NextResponse.json({ success: true, order })
  } catch {
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
