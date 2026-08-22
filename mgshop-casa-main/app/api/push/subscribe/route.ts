import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
export async function POST(req: Request) {
  const { subscription, phoneNumber, isAdmin } = await req.json()
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
        // Le subscription "admin" (quella attivata da te nel pannello) sono
        // marcate qui: sendPushToAdmin() usa questo flag per mandare solo a
        // te le notifiche di servizio (nuovo ordine, chat, visite...) invece
        // che a tutti i clienti iscritti.
        is_admin: isAdmin === true,
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

// DELETE - rimuove la subscription quando l'utente disattiva le notifiche
// dallo switch nel popup "Il mio account" (o da qualunque altro punto).
export async function DELETE(req: Request) {
  const { endpoint } = await req.json()
  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint mancante' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .contains('subscription', { endpoint })
  if (error) {
    console.error('Errore rimozione push subscription:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
