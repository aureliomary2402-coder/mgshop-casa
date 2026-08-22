import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 30

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const categoria = searchParams.get('categoria') || ''
  const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1', 10) || 1)
  const ordina = searchParams.get('ordina') || 'recenti'
  // Elenco di id specifici (preferiti, visti di recente): quando presente
  // ignora paginazione/ordinamento e restituisce solo quei prodotti, nello
  // stesso ordine degli id passati (il chiamante decide l'ordine, es. più
  // recente prima).
  const idsParam = searchParams.get('ids') || ''

  const supabase = createAdminClient()

  if (idsParam) {
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 50)
    if (ids.length === 0) return NextResponse.json({ products: [], count: 0 })
    const { data: products, error } = await supabase.from('products').select('*, category:categories(*)').eq('is_active', true).in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const byId = Object.fromEntries((products || []).map(p => [p.id, p]))
    const ordered = ids.map(id => byId[id]).filter(Boolean)
    return NextResponse.json({ products: ordered, count: ordered.length })
  }

  let query = supabase.from('products').select('*, category:categories(*)', { count: 'exact' }).eq('is_active', true)
  query = ordina === 'prezzo_asc' ? query.order('price', { ascending: true })
    : ordina === 'prezzo_desc' ? query.order('price', { ascending: false })
    : ordina === 'nome' ? query.order('name', { ascending: true })
    : query.order('created_at', { ascending: false })

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
