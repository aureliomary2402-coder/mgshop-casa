import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

type PageViewRow = {
  page: string
  created_at: string
  country?: string | null
  region?: string | null
  city?: string | null
  visitor_id?: string | null
  timezone?: string | null
  visits?: number | null
}

// Estrae l'id prodotto da un path tipo "/prodotto/123"
function extractProductId(page: string): string | null {
  const match = page.match(/^\/prodotto\/([^/?#]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

// Arricchisce le visite alle schede prodotto con nome, immagine e link,
// cosi in admin si vede subito QUALE prodotto e stato visualizzato
// invece del solo id nell'URL.
async function enrichWithProducts(
  supabase: ReturnType<typeof createAdminClient>,
  items: PageViewRow[]
) {
  const ids = Array.from(
    new Set(items.map((i) => extractProductId(i.page)).filter((id): id is string => !!id))
  )
  if (ids.length === 0) return items

  const { data: products } = await supabase
    .from('products')
    .select('id, name, cover_image')
    .in('id', ids)

  const productMap = new Map((products || []).map((p) => [String(p.id), p]))

  return items.map((item) => {
    const productId = extractProductId(item.page)
    if (!productId) return item
    const product = productMap.get(productId)
    return {
      ...item,
      product: product
        ? { id: product.id, name: product.name, image: product.cover_image, url: `/prodotto/${product.id}` }
        : { id: productId, name: null, image: null, url: `/prodotto/${productId}` },
    }
  })
}

async function enrichWithVisitors(
  supabase: ReturnType<typeof createAdminClient>,
  items: PageViewRow[]
) {
  const ids = Array.from(
    new Set(items.map((i) => i.visitor_id).filter((x): x is string => !!x))
  )
  if (ids.length === 0) return items
  const { data } = await supabase.from('visitors').select('visitor_id, visits').in('visitor_id', ids)
  const map = new Map((data || []).map((v) => [v.visitor_id, v.visits]))
  return items.map((i) => (i.visitor_id ? { ...i, visits: map.get(i.visitor_id) ?? null } : i))
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()

  const [storeRes, adminRes, storeCount, adminCount, botCount] = await Promise.all([
    supabase.from('page_views').select('page, created_at, country, region, city, visitor_id, timezone')
      .eq('is_admin', false).eq('is_bot', false).order('created_at', { ascending: false }).limit(100),
    supabase.from('page_views').select('page, created_at, country, region, city, visitor_id, timezone')
      .eq('is_admin', true).eq('is_bot', false).order('created_at', { ascending: false }).limit(100),
    supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('is_admin', false).eq('is_bot', false),
    supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('is_admin', true).eq('is_bot', false),
    // Visite di bot/crawler filtrate nelle ultime 48 ore, solo per farti
    // vedere quanto traffico automatico arriva (non è un errore: sono i
    // motori di ricerca che leggono le pagine per indicizzarle).
    supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('is_bot', true),
  ])

  const [storeItems, adminItems] = await Promise.all([
    enrichWithProducts(supabase, await enrichWithVisitors(supabase, storeRes.data || [])),
    enrichWithProducts(supabase, await enrichWithVisitors(supabase, adminRes.data || [])),
  ])

  return NextResponse.json({
    store: { total: storeCount.count || 0, items: storeItems },
    admin: { total: adminCount.count || 0, items: adminItems },
    botFiltered: botCount.count || 0,
  })
}
