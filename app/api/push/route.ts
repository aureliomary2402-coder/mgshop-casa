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
    const providedSecret = request.headers.get('x-admin-secret')
    if (providedSecret !== process.env.PUSH_ADMIN_SECRET) {
      return NextResponse.json({ ok: false, error: 'Non autorizzato' }, { status: 401 })
    }

    const { title, body, url, onlyOrdered = true, phoneNumbers } = await request.json()
    const supabase = createAdminClient()

    // Esclude sempre le subscription admin (is_admin=true): questo canale
    // manda notifiche ai clienti, il dispositivo admin non deve riceverle.
    let query = supabase
      .from('push_subscriptions')
      .select('id, subscription, phone_number')
      .or('is_admin.is.null,is_admin.eq.false')

    if (Array.isArray(phoneNumbers) && phoneNumbers.length > 0) {
      query = query.in('phone_number', phoneNumbers)
    } else if (onlyOrdered) {
      query = query.not('phone_number', 'is', null)
    }

    const { data: subs } = await query
    if (!subs || subs.length === 0) return NextResponse.json({ ok: true, sent: 0 })

    const payload = JSON.stringify({ title, body, url })
    let sent = 0

    for (const { subscription, id } of subs) {
      try {
        await webpush.sendNotification(subscription as webpush.PushSubscription, payload)
        sent++
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', id)
        }
      }
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('Push error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
