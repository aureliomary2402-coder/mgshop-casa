import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Note private dell'admin (es. dove rifornirsi). Sempre protette dal login:
// niente di qui deve mai arrivare ai clienti.
async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('product_admin_notes').select('product_id, supplier_note')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const map: Record<string, string> = {}
  for (const row of data || []) map[row.product_id] = row.supplier_note
  return NextResponse.json(map)
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { product_id, supplier_note } = await request.json()
  if (!product_id) return NextResponse.json({ error: 'product_id mancante' }, { status: 400 })
  const supabase = createAdminClient()
  const note = String(supplier_note ?? '').trim()
  if (!note) {
    const { error } = await supabase.from('product_admin_notes').delete().eq('product_id', product_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }
  const { error } = await supabase
    .from('product_admin_notes')
    .upsert({ product_id, supplier_note: note, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
