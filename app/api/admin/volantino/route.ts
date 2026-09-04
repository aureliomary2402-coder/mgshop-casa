import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

// Elenco completo di tutti i volantini (usato dal pannello admin per la
// lista/i tab con cui l'admin passa da un volantino all'altro).
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('volantino_page')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Crea un nuovo volantino vuoto (disattivato di default): l'admin lo
// personalizza subito dopo dal pannello (titolo, prodotti, ecc).
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const supabase = createAdminClient()

  const { data: existing } = await supabase.from('volantino_page').select('sort_order')
  const nextSortOrder = existing && existing.length > 0
    ? Math.max(...existing.map(v => v.sort_order ?? 0)) + 1
    : 0

  const { data, error } = await supabase
    .from('volantino_page')
    .insert({
      title: body.title || 'Nuovo volantino',
      subtitle: body.subtitle || '',
      is_active: false,
      items: [],
      sort_order: nextSortOrder,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
