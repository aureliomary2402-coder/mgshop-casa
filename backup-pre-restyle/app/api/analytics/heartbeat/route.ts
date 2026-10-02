import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, visitorId, page } = await request.json()
    if (!sessionId) return NextResponse.json({ ok: false })
    const vid = typeof visitorId === 'string' && visitorId.length <= 64 ? visitorId : null
    const supabase = createAdminClient()
    await supabase.from('active_sessions').upsert({
      session_id: sessionId,
      visitor_id: vid,
      page: page || '/',
      last_seen: new Date().toISOString(),
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
