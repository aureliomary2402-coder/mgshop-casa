import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, page } = await request.json()
    if (!sessionId) return NextResponse.json({ ok: false })
    const supabase = createAdminClient()
    await supabase.from('active_sessions').upsert({
      session_id: sessionId,
      page: page || '/',
      last_seen: new Date().toISOString(),
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
