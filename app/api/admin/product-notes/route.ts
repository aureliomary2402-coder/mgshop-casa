import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Note private dell'admin (es. dove rifornirsi). Sempre protette dal login:
// niente di qui deve mai arrivare ai clienti.
// - note di prodotti del catalogo: chiave = id del prodotto
// - note di prodotti personalizzati della Promo: chiave = "promo:<id voce>"
async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const map: Record<string, string> = {}
  const { data, error } = await supabase.from('product_admin_notes').select('product_id, supplier_note')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  for (const row of data || []) map[row.product_id] = row.supplier_note
  // Tabella delle note promo: se non e' ancora stata creata si ignora in silenzio
  const { data: promoData } = await supabase.from('promo_item_admin_notes').select('item_id, supplier_note')
  for (const row of promoData || []) map[`promo:${row.item_id}`] = row.supplier_note
  return NextResponse.json(map)
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { product_id, promo_item_id, supplier_note } = await request.json()
  if (!product_id && !promo_item_id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
  const supabase = createAdminClient()
  const note = String(supplier_note ?? '').trim()
  const table = promo_item_id ? 'promo_item_admin_notes' : 'product_admin_notes'
  const column = promo_item_id ? 'item_id' : 'product_id'
  const id = promo_item_id || product_id
  if (!note) {
    const { error } = await supabase.from(table).delete().eq(column, id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }
  const { error } = await supabase
    .from(table)
    .upsert({ [column]: id, supplier_note: note, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
