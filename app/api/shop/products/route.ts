import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 30

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const categoria = searchParams.get('categoria') || ''
  const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1', 10) || 1)

  const supabase = createAdminClient()
  let query = supabase.from('products').select('*, category:categories(*)', { count: 'exact' }).eq('is_active', true).order('created_at', { ascending: false })

  if (categoria) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', categoria).single()
    if (cat) query = query.eq('category_id', cat.id)
  }
  if (q) query = query.ilike('name', `%${q}%`)

  const from = (pagina - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  query = query.range(from, to)

  const { data: products, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ products: products || [], count: count || 0 })
}
