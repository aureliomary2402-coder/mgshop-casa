import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

// Una sessione è considerata "attiva" se ha inviato un segnale negli ultimi 45 secondi
const ACTIVE_WINDOW_SECONDS = 45

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const since = new Date(Date.now() - ACTIVE_WINDOW_SECONDS * 1000).toISOString()

  const { data } = await supabase
    .from('active_sessions')
    .select('page, last_seen, visitor_id')
    .gte('last_seen', since)

  const sessions = data || []

  // Persone distinte: più schede dello stesso visitatore contano una volta sola
  const people = new Set<string>()
  let anonymous = 0
  for (const s of sessions) {
    if (s.visitor_id) people.add(s.visitor_id)
    else anonymous++
  }

  const pageCounts: Record<string, number> = {}
  for (const s of sessions) {
    const p = s.page || '/'
    pageCounts[p] = (pageCounts[p] || 0) + 1
  }
  const pages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([page, count]) => ({ page, count }))

  return NextResponse.json({ count: people.size + anonymous, tabs: sessions.length, pages })
}
