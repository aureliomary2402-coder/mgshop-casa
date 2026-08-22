import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

// Aggiorna quantità di un item
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, quantity, order_id } = await request.json()
  const supabase = createAdminClient()

  if (quantity <= 0) {
    // Elimina l'item
    const { error } = await supabase.from('order_items').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('order_items').update({ quantity }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Ricalcola totale ordine
  const { data: items } = await supabase.from('order_items').select('product_price, quantity').eq('order_id', order_id)
  const newTotal = (items || []).reduce((s, i) => s + i.product_price * i.quantity, 0)
  await supabase.from('orders').update({ total: newTotal }).eq('id', order_id)

  return NextResponse.json({ success: true, newTotal })
}

// Aggiungi un prodotto all'ordine
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { order_id, product_id, product_name, product_price, quantity } = await request.json()
  const supabase = createAdminClient()

  // Controlla se esiste già
  const { data: existing } = await supabase.from('order_items').select('id, quantity').eq('order_id', order_id).eq('product_id', product_id).single()

  if (existing) {
    await supabase.from('order_items').update({ quantity: existing.quantity + quantity }).eq('id', existing.id)
  } else {
    await supabase.from('order_items').insert({ order_id, product_id, product_name, product_price, quantity })
  }

  // Ricalcola totale
  const { data: items } = await supabase.from('order_items').select('product_price, quantity').eq('order_id', order_id)
  const newTotal = (items || []).reduce((s, i) => s + i.product_price * i.quantity, 0)
  await supabase.from('orders').update({ total: newTotal }).eq('id', order_id)

  return NextResponse.json({ success: true, newTotal })
}

// Elimina un item
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, order_id } = await request.json()
  const supabase = createAdminClient()

  await supabase.from('order_items').delete().eq('id', id)

  const { data: items } = await supabase.from('order_items').select('product_price, quantity').eq('order_id', order_id)
  const newTotal = (items || []).reduce((s, i) => s + i.product_price * i.quantity, 0)
  await supabase.from('orders').update({ total: newTotal }).eq('id', order_id)

  return NextResponse.json({ success: true, newTotal })
}
