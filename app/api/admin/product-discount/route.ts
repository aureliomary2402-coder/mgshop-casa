import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { applyProductDiscount, clearProductDiscount, setDiscountEnd } from '@/lib/product-discounts'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

// Applica uno sconto diretto a un prodotto.
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const salePrice = Number(body.sale_price)
  const endsAt = typeof body.sale_ends_at === 'string' && body.sale_ends_at ? body.sale_ends_at : null
  const db = createAdminClient()
  // Senza sale_price cambia solo la data di fine dello sconto già impostato.
  const result = body.sale_price == null
    ? await setDiscountEnd(db, body.product_id, endsAt)
    : await applyProductDiscount(db, body.product_id, salePrice, endsAt)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ success: true })
}

// Toglie lo sconto diretto da un prodotto.
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { product_id } = await request.json()
  const result = await clearProductDiscount(createAdminClient(), product_id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ success: true })
}
