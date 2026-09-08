import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('wishlist_snapshots')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recuperiamo nome/prezzo/immagine dei prodotti coinvolti, e controlliamo
  // (come per i carrelli abbandonati) se quella sessione ha le notifiche
  // push attive, per poter mandare un promemoria mirato.
  const allProductIds = Array.from(new Set((data || []).flatMap(w => w.product_ids as string[])))
  const productById: Record<string, { id: string; name: string; price: number; image: string | null }> = {}
  if (allProductIds.length > 0) {
    const { data: products } = await supabase.from('products').select('id, name, price, card_image, cover_image').in('id', allProductIds)
    for (const p of products || []) {
      productById[p.id] = { id: p.id, name: p.name, price: p.price, image: p.card_image || p.cover_image || null }
    }
  }

  const sessionIds = Array.from(new Set((data || []).map(w => w.session_id).filter(Boolean)))
  const pushBySession = new Set<string>()
  if (sessionIds.length > 0) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('session_id')
      .in('session_id', sessionIds)
      .or('is_admin.is.null,is_admin.eq.false')
    for (const s of subs || []) { if (s.session_id) pushBySession.add(s.session_id) }
  }

  const result = (data || []).map(w => ({
    id: w.id,
    session_id: w.session_id,
    updated_at: w.updated_at,
    has_push: pushBySession.has(w.session_id),
    products: (w.product_ids as string[]).map(id => productById[id]).filter(Boolean),
  })).filter(w => w.products.length > 0)

  return NextResponse.json(result)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('wishlist_snapshots').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
