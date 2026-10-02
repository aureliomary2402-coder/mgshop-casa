import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { notificationId } = await request.json()
    if (!notificationId) return NextResponse.json({ ok: false }, { status: 400 })

    const supabase = createAdminClient()
    await supabase.rpc('increment_notification_click', { row_id: notificationId })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
