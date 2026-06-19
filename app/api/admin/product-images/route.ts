import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const product_id = searchParams.get('product_id')
  const supabase = createAdminClient()
  const query = supabase.from('product_images').select('*').order('display_order')
  if (product_id) query.eq('product_id', product_id)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('product_images')
    .insert({ product_id: body.product_id, image_url: body.image_url, display_order: body.display_order ?? 0 })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('product_images').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
