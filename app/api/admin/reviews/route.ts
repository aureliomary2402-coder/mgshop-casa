import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*, review_media(id, review_id, media_url, media_type, display_order, created_at)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reviews = (data || []).map((r: any) => {
    const { review_media, ...rest } = r
    return { ...rest, media: (review_media || []).sort((a: any, b: any) => a.display_order - b.display_order) }
  })

  return NextResponse.json(reviews)
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, admin_reply } = await request.json()
  if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('reviews')
    .update({
      admin_reply: admin_reply ? String(admin_reply).trim() : null,
      admin_reply_at: admin_reply ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
