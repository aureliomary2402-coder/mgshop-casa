import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const subscription = await request.json()
  const supabase = createAdminClient()
  // Niente colonna "id" nel payload, quindi un upsert con onConflict:'id'
  // non troverebbe mai un conflitto reale e creerebbe righe duplicate per
  // lo stesso dispositivo. Rimuoviamo prima l'eventuale subscription già
  // salvata con lo stesso endpoint, poi inseriamo quella nuova.
  await supabase.from('push_subscriptions').delete().contains('subscription', { endpoint: subscription.endpoint })
  const { error } = await supabase.from('push_subscriptions').insert({ subscription })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { endpoint } = await request.json()
  const supabase = createAdminClient()
  await supabase.from('push_subscriptions').delete().contains('subscription', { endpoint })
  return NextResponse.json({ ok: true })
}
