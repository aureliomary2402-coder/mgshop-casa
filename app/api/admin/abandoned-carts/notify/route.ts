import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import webpush from 'web-push'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Manda un promemoria push mirato a chi ha abbandonato QUESTO carrello
// specifico, usando l'iscrizione notifiche collegata alla stessa sessione
// del browser: funziona anche se il cliente non ha mai lasciato un numero.
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })
  const supabase = createAdminClient()

  const { data: cart, error: cartError } = await supabase
    .from('abandoned_carts')
    .select('id, session_id, items_count, total')
    .eq('id', id)
    .single()
  if (cartError || !cart) return NextResponse.json({ error: 'Carrello non trovato' }, { status: 404 })

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('session_id', cart.session_id)
    .or('is_admin.is.null,is_admin.eq.false')
  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: 'Nessuna notifica attiva per questo carrello' }, { status: 400 })
  }

  const title = 'Hai lasciato qualcosa nel carrello 🛒'
  const body = `${cart.items_count} articol${cart.items_count === 1 ? 'o' : 'i'} ti aspettano — €${Number(cart.total).toFixed(2)}. Torna a completare l'ordine!`
  const payload = JSON.stringify({ title, body, url: '/carrello' })

  let sent = 0
  for (const { subscription, id: subId } of subs) {
    try {
      await webpush.sendNotification(subscription as webpush.PushSubscription, payload)
      sent++
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', subId)
      }
    }
  }

  if (sent === 0) return NextResponse.json({ error: 'Invio non riuscito' }, { status: 500 })
  return NextResponse.json({ ok: true, sent })
}
