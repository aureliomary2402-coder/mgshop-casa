import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { term } = await request.json()
    const clean = (term || '').toString().trim().toLowerCase()
    if (!clean || clean.length < 2) return NextResponse.json({ ok: false })
    const supabase = createAdminClient()
    await supabase.from('search_logs').insert({ term: clean })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
