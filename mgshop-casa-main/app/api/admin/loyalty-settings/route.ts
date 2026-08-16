import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('loyalty_settings').select('*').limit(1).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()
  const { data: existing } = await supabase.from('loyalty_settings').select('id').limit(1).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data, error } = await supabase.from('loyalty_settings')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', existing.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
