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

// Manda un promemoria push mirato a chi ha questi prodotti nei preferiti,
// usando l'iscrizione notifiche collegata alla stessa sessione del browser
// (stesso meccanismo dei carrelli abbandonati).
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })
  const supabase = createAdminClient()

  const { data: wishlist, error: wError } = await supabase
    .from('wishlist_snapshots')
    .select('id, device_id, product_ids')
    .eq('id', id)
    .single()
  if (wError || !wishlist) return NextResponse.json({ error: 'Preferiti non trovati' }, { status: 404 })

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('device_id', wishlist.device_id)
    .or('is_admin.is.null,is_admin.eq.false')
  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: 'Nessuna notifica attiva per questi preferiti' }, { status: 400 })
  }

  const count = (wishlist.product_ids as string[]).length
  const title = 'I tuoi preferiti ti aspettano 💛'
  const body = `Hai ${count} prodott${count === 1 ? 'o' : 'i'} nei preferiti — dai un'occhiata prima che finiscano!`
  const payload = JSON.stringify({ title, body, url: '/preferiti' })

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
