import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('promo_page').select('*').limit(1).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const supabase = createAdminClient()
  const { data: existing } = await supabase.from('promo_page').select('id').limit(1).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data, error } = await supabase.from('promo_page').update(body).eq('id', existing.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
