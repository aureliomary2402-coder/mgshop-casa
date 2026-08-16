import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// Restituisce il coupon attivo con lo sconto piu alto valido per la sezione promo,
// cosi la pagina promo puo mostrare in automatico il prezzo scontato sui prodotti
export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get('scope') || 'promo'
  const supabase = createAdminClient()
  const { data: coupons, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('is_active', true)
    .in('scope', scope === 'promo' ? ['promo', 'all'] : ['shop', 'all'])

  if (error) return NextResponse.json(null)

  const now = new Date()
  const valid = (coupons || []).filter((c) => {
    if (c.expires_at && new Date(c.expires_at) < now) return false
    if (c.max_uses && c.uses_count >= c.max_uses) return false
    return true
  })

  if (valid.length === 0) return NextResponse.json(null)

  // Sceglie il coupon che da lo sconto maggiore in percentuale (uso indicativo, non calcola su un prezzo specifico)
  const best = valid.sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0))[0]
  return NextResponse.json(best)
}

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

  // Nota: coupon.scope indica su QUALI PRODOTTI si applica lo sconto (solo promo o tutto il negozio),
  // non da quale pagina puo' essere riscattato. Il coupon va sempre validato qui; sara' il carrello
  // a calcolare lo sconto solo sui prodotti in promo se scope === 'promo' (vedi cart-content.tsx).

  return NextResponse.json(coupon)
}
