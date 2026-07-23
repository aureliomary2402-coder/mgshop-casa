import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: body.name,
      description: body.description,
      price: body.price,
      category_id: body.category_id || null,
      cover_image: body.cover_image,
      card_image: body.card_image || null,
      is_active: body.is_active ?? true,
      stock: body.stock !== '' && body.stock !== null && body.stock !== undefined ? parseInt(body.stock) : null,
    })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .update({
      name: body.name,
      description: body.description,
      price: body.price,
      category_id: body.category_id || null,
      cover_image: body.cover_image,
      card_image: body.card_image || null,
      is_active: body.is_active,
      stock: body.stock !== '' && body.stock !== null && body.stock !== undefined ? parseInt(body.stock) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
