import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const { subscription, phoneNumber } = await req.json()

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'subscription non valida' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        subscription,
        phone_number: phoneNumber ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

  if (error) {
    console.error('Errore salvataggio push subscription:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
