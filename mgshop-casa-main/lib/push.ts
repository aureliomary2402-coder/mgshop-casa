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
  // /mgadmin-panel): prima qui si prendevano TUTTE le subscription, quindi
  // ordini/chat/visite arrivavano anche ai clienti che avevano attivato le
  // notifiche dallo switch nel popup account.
  const { data: subs } = await supabase.from('push_subscriptions').select('subscription').eq('is_admin', true)
  if (!subs || subs.length === 0) return { sent: 0 }

  const payload = JSON.stringify({ title, body, url })
  let sent = 0
  for (const { subscription } of subs) {
    try {
      await webpush.sendNotification(subscription as webpush.PushSubscription, payload)
      sent++
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
        await supabase.from('push_subscriptions').delete().contains('subscription', { endpoint: (subscription as { endpoint: string }).endpoint })
      }
    }
  }
  return { sent }
}
