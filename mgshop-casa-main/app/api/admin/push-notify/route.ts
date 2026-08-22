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
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  const { title, body, url, imageUrl } = await request.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Titolo e messaggio sono obbligatori' }, { status: 400 })
  }
  // Se non viene scelto un link, il click sulla notifica porta alla home
  // (non piu' al pannello admin, che per un cliente non ha senso).
  const finalUrl = (typeof url === 'string' && url.trim()) ? url.trim() : '/'
  const finalImageUrl = (typeof imageUrl === 'string' && imageUrl.trim()) ? imageUrl.trim() : null
  const supabase = createAdminClient()
  // Esclude esplicitamente le subscription admin (is_admin=true): questo
  // canale è per le notifiche marketing/informative ai clienti, il
  // dispositivo admin non deve mai riceverle qui (riceve solo gli avvisi
  // di servizio tramite sendPushToAdmin).
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .or('is_admin.is.null,is_admin.eq.false')
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Nessun cliente iscritto alle notifiche' })
  }
  const { data: logRow } = await supabase
    .from('push_notifications_log')
    .insert({ title, body, sent_count: 0, failed_count: 0, link_url: finalUrl, image_url: finalImageUrl })
    .select('id')
    .single()
  const notificationId = logRow?.id || null
  const payload = JSON.stringify({ title, body, url: finalUrl, imageUrl: finalImageUrl, notificationId })
  let sent = 0
  let failed = 0
  for (const { subscription, id } of subs) {
    try {
      await webpush.sendNotification(subscription as webpush.PushSubscription, payload)
      sent++
    } catch (err: unknown) {
      failed++
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', id)
      }
    }
  }
  if (notificationId) {
    await supabase
      .from('push_notifications_log')
      .update({ sent_count: sent, failed_count: failed })
      .eq('id', notificationId)
  }
  return NextResponse.json({ ok: true, sent, failed })
}
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  const supabase = createAdminClient()
  // Stessa esclusione del POST: l'elenco/conteggio "clienti iscritti" non
  // deve includere il dispositivo admin.
  const { data: subscribers } = await supabase
    .from('push_subscriptions')
    .select('id, phone_number, label, created_at')
    .or('is_admin.is.null,is_admin.eq.false')
    .order('created_at', { ascending: false })
  const { data: history } = await supabase
    .from('push_notifications_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  return NextResponse.json({
    activeSubscriptions: subscribers?.length || 0,
    subscribers: subscribers || [],
    history: history || [],
  })
}
// PATCH - assegna/modifica un nome (label) a un numero iscritto, per
// riconoscere i clienti nell'elenco invece del solo numero di telefono.
export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  const { id, label } = await request.json()
  if (!id) {
    return NextResponse.json({ error: 'ID mancante' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ label: typeof label === 'string' ? (label.trim() || null) : null })
    .eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  const { id } = await request.json()
  if (!id) {
    return NextResponse.json({ error: 'ID mancante' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('push_notifications_log')
    .delete()
    .eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
