import { createAdminClient } from '@/lib/supabase/admin'
import webpush from 'web-push'

let configured = false
function ensureVapid() {
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )
    configured = true
  }
}

export async function sendPushToAdmin(title: string, body: string, url?: string) {
  ensureVapid()
  const supabase = createAdminClient()
  // Solo le subscription marcate is_admin=true (attivate da te nel pannello
  // /mgadmin-panel), cosi ordini/chat/visite non arrivano ai clienti.
  const { data: subs } = await supabase.from('push_subscriptions').select('subscription').eq('is_admin', true)
  if (!subs || subs.length === 0) {
    console.error('Push admin: nessuna iscrizione admin trovata, notifica non inviata:', title)
    return { sent: 0, failed: 0 }
  }

  const payload = JSON.stringify({ title, body, url })
  // urgency "high" e TTL di 1 giorno: il telefono la consegna subito anche
  // a schermo spento e, se e' irraggiungibile, la tiene in coda invece di
  // perderla.
  const options = { TTL: 86400, urgency: 'high' as const }

  // Invio in parallelo: una iscrizione lenta o rotta non blocca le altre.
  const results = await Promise.allSettled(
    subs.map(({ subscription }) =>
      webpush.sendNotification(subscription as webpush.PushSubscription, payload, options)
    )
  )

  let sent = 0
  let failed = 0
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled') {
      sent++
      continue
    }
    failed++
    const status = r.reason?.statusCode
    console.error('Push admin fallita, codice', status, r.reason?.body || r.reason?.message || '')
    // 404/410 = iscrizione scaduta o revocata: va eliminata.
    if (status === 404 || status === 410) {
      const endpoint = (subs[i].subscription as { endpoint: string }).endpoint
      await supabase.from('push_subscriptions').delete().contains('subscription', { endpoint })
    }
  }
  return { sent, failed }
}
