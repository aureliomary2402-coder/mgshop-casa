import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { title, body, url } = await request.json()
    const supabase = createAdminClient()
    const { data: subs } = await supabase.from('push_subscriptions').select('subscription')
    if (!subs || subs.length === 0) return NextResponse.json({ ok: true, sent: 0 })

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
    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('Push error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
