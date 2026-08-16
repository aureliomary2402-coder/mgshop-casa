import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const now = new Date()
  const last30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString()
  const last1 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [{ data: items }, { data: searches }] = await Promise.all([
    supabase.from('order_items').select('product_id, product_name, product_price, quantity'),
    supabase.from('search_logs').select('term, created_at').gte('created_at', last30),
  ])

  // Prodotti più venduti: raggruppa per product_id (o nome se manca l'id)
  const soldMap: Record<string, { key: string; product_id: string | null; name: string; quantity: number; revenue: number }> = {}
  for (const it of items || []) {
    const key = it.product_id || `name:${it.product_name}`
    if (!soldMap[key]) {
      soldMap[key] = { key, product_id: it.product_id, name: it.product_name, quantity: 0, revenue: 0 }
    }
    soldMap[key].quantity += it.quantity || 0
    soldMap[key].revenue += (it.product_price || 0) * (it.quantity || 0)
  }
  const topSelling = Object.values(soldMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)

  // Termini più cercati: un conteggio sugli ultimi 30 giorni e uno solo sulle ultime 24 ore
  const buildTopTerms = (rows: { term: string }[]) => {
    const termMap: Record<string, number> = {}
    for (const s of rows) termMap[s.term] = (termMap[s.term] || 0) + 1
    return Object.entries(termMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }))
  }
  const allSearches = searches || []
  const topSearched30 = buildTopTerms(allSearches)
  const topSearchedToday = buildTopTerms(allSearches.filter(s => s.created_at >= last1))

  return NextResponse.json({ topSelling, topSearched30, topSearchedToday })
}
