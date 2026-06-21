import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { code, scope } = await request.json()
  if (!code) return NextResponse.json({ error: 'Codice mancante' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single()

  if (error || !coupon) return NextResponse.json({ error: 'Coupon non valido' }, { status: 404 })

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
    return NextResponse.json({ error: 'Coupon scaduto' }, { status: 400 })

  if (coupon.max_uses && coupon.uses_count >= coupon.max_uses)
    return NextResponse.json({ error: 'Coupon esaurito' }, { status: 400 })

  if (coupon.scope === 'promo' && scope !== 'promo')
    return NextResponse.json({ error: 'Coupon valido solo nella sezione promo' }, { status: 400 })

  return NextResponse.json(coupon)
}
