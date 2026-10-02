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
  const withPushInfo = (data || []).map(c => ({ ...c, has_push: pushBySession.has(c.session_id) }))
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
