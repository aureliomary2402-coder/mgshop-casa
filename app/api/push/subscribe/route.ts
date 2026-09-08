import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
export async function POST(req: Request) {
  const { subscription, phoneNumber, isAdmin, sessionId, deviceId } = await req.json()
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'subscription non valida' }, { status: 400 })
  }
  const supabase = createAdminClient()
  // phoneNumber viene incluso solo se il chiamante lo ha passato davvero:
  // il ricollegamento silenzioso (syncPushSession) non lo invia mai, così
  // non cancelliamo un numero già salvato in precedenza per la stessa
  // iscrizione quando la stiamo solo ricollegando alla sessione corrente.
  const updateData: Record<string, unknown> = {
    subscription,
    // Collega l'iscrizione alla sessione del browser: permette di
    // ricontattare con una notifica mirata chi abbandona il carrello
    // anche se non ha mai lasciato un numero di telefono.
    session_id: typeof sessionId === 'string' && sessionId ? sessionId : null,
    // Collega l'iscrizione anche all'id stabile del dispositivo: a
    // differenza della sessione (che cambia a ogni visita), serve per
    // ricontattare chi ha lasciato prodotti nei preferiti, che restano
    // salvati anche a distanza di giorni.
    device_id: typeof deviceId === 'string' && deviceId ? deviceId : null,
    // Le subscription "admin" (quella attivata da te nel pannello) sono
    // marcate qui: sendPushToAdmin() usa questo flag per mandare solo a
    // te le notifiche di servizio (nuovo ordine, chat, visite...) invece
    // che a tutti i clienti iscritti.
    is_admin: isAdmin === true,
    updated_at: new Date().toISOString(),
  }
  if (phoneNumber !== undefined) updateData.phone_number = phoneNumber ?? null
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(updateData, { onConflict: 'endpoint' })
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
