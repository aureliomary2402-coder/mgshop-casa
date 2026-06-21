import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { page } = await request.json()
    if (!page) return NextResponse.json({ ok: false })
    const supabase = createAdminClient()
    await supabase.from('page_views').insert({ page })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
