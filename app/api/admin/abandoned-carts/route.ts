import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { LOTTERY_TICKET_PRODUCT_ID } from '@/lib/lottery-ticket-product'
import { isCustomPromoProductId } from '@/lib/promo-custom-product'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('abandoned_carts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Per ogni carrello controlliamo se quella sessione ha anche una notifica
  // push attiva: se sì, l'admin può ricontattare il cliente anche senza
  // avere il suo numero di telefono.
  const sessionIds = Array.from(new Set((data || []).map(c => c.session_id).filter(Boolean)))
  const pushBySession = new Set<string>()
  if (sessionIds.length > 0) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('session_id')
      .in('session_id', sessionIds)
      .or('is_admin.is.null,is_admin.eq.false')
    for (const s of subs || []) { if (s.session_id) pushBySession.add(s.session_id) }
  }
  // Prodotti non più ordinabili (disattivati o eliminati): i carrelli nuovi
  // salvano l'id del prodotto e il controllo è preciso; quelli vecchi hanno
  // solo il nome, quindi lì segnaliamo solo i prodotti che esistono ancora
  // ma sono disattivati (un nome non trovato potrebbe essere un prodotto
  // creato nella pagina Promo, che non sta nella tabella prodotti).
  type CartItem = { id?: string; name?: string; quantity?: number; price?: number }
  const allItems: CartItem[] = (data || []).flatMap(c => (Array.isArray(c.items) ? c.items : []))
  const itemIds = Array.from(new Set(allItems.map(i => i.id).filter((x): x is string => typeof x === 'string' && x !== LOTTERY_TICKET_PRODUCT_ID && !isCustomPromoProductId(x))))
  const itemNames = Array.from(new Set(allItems.filter(i => !i.id).map(i => i.name).filter((x): x is string => !!x && x !== 'Biglietto Lotteria')))
  const activeIds = new Set<string>()
  let idsChecked = false
  if (itemIds.length > 0) {
    const { data: rows, error: idErr } = await supabase.from('products').select('id').eq('is_active', true).in('id', itemIds)
    if (!idErr) { idsChecked = true; for (const r of rows || []) activeIds.add(String(r.id)) }
  }
  const inactiveNames = new Set<string>()
  const activeNames = new Set<string>()
  if (itemNames.length > 0) {
    const { data: rows } = await supabase.from('products').select('name, is_active').in('name', itemNames)
    for (const r of rows || []) (r.is_active ? activeNames : inactiveNames).add(r.name)
  }
  const withPushInfo = (data || []).map(c => {
    const items = (Array.isArray(c.items) ? c.items : []).map((i: CartItem) => {
      let unavailable = false
      if (i.id) {
        if (idsChecked && i.id !== LOTTERY_TICKET_PRODUCT_ID && !isCustomPromoProductId(i.id)) unavailable = !activeIds.has(i.id)
      } else if (i.name) {
        unavailable = inactiveNames.has(i.name) && !activeNames.has(i.name)
      }
      return { ...i, unavailable }
    })
    return { ...c, items, has_push: pushBySession.has(c.session_id) }
  })
  return NextResponse.json(withPushInfo)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('abandoned_carts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
