import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface VolantinoItem {
  product_id: string
  sale_price: number
}

// Allinea il prezzo del prodotto nel negozio con quello impostato nel
// volantino, così il cliente vede lo stesso prezzo sia che aggiunga il
// prodotto al carrello dal volantino sia che lo aggiunga dal negozio.
async function syncProductPrices(
  supabase: ReturnType<typeof createAdminClient>,
  oldItems: VolantinoItem[],
  newItems: VolantinoItem[]
) {
  const oldMap = new Map(oldItems.map(i => [i.product_id, i.sale_price]))
  const newMap = new Map(newItems.map(i => [i.product_id, i.sale_price]))

  // Prodotti tolti dal volantino: ripristina il prezzo pieno nel negozio.
  for (const productId of Array.from(oldMap.keys())) {
    if (newMap.has(productId)) continue
    const { data: product } = await supabase.from('products').select('old_price').eq('id', productId).single()
    if (product?.old_price != null) {
      await supabase.from('products').update({ price: product.old_price, old_price: null }).eq('id', productId)
    }
  }

  // Prodotti aggiunti o con prezzo promo modificato: applica il nuovo
  // prezzo anche nel negozio, tenendo da parte il prezzo pieno originale
  // (senza sovrascriverlo se il prodotto era già in offerta).
  for (const [productId, salePrice] of Array.from(newMap)) {
    if (oldMap.get(productId) === salePrice) continue
    const { data: product } = await supabase.from('products').select('price, old_price').eq('id', productId).single()
    if (!product) continue
    const fullPrice = product.old_price != null ? product.old_price : product.price
    await supabase.from('products').update({ price: salePrice, old_price: fullPrice }).eq('id', productId)
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('volantino_page').select('*').eq('id', id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const supabase = createAdminClient()

  const update: Record<string, any> = {}
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active
  if (typeof body.title === 'string') update.title = body.title
  if (typeof body.subtitle === 'string') update.subtitle = body.subtitle
  if (Array.isArray(body.items)) {
    const { data: existing } = await supabase.from('volantino_page').select('items').eq('id', id).single()
    await syncProductPrices(supabase, existing?.items || [], body.items)
    update.items = body.items
  }

  if (typeof body.slug === 'string' && body.slug.trim()) {
    const cleaned = slugify(body.slug)
    if (!cleaned) return NextResponse.json({ error: 'Slug non valido' }, { status: 400 })
    const { data: existing } = await supabase.from('volantino_page').select('id').eq('slug', cleaned).neq('id', id).maybeSingle()
    if (existing) return NextResponse.json({ error: 'Slug già in uso da un altro volantino' }, { status: 409 })
    update.slug = cleaned
  }

  const { data, error } = await supabase.from('volantino_page').update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('volantino_page').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
