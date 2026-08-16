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
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString()
  const last7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()
  const last30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString()

  const [total, todayViews, yesterdayViews, last7Views, last30Views, byPage, byDay] = await Promise.all([
    supabase.from('page_views').select('*', { count: 'exact', head: true }),
    supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', today),
    supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', yesterday).lt('created_at', today),
    supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', last7),
    supabase.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', last30),
    supabase.from('page_views').select('page').gte('created_at', last30),
    supabase.from('page_views').select('created_at').gte('created_at', last7),
  ])

  const pageCount: Record<string, number> = {}
  byPage.data?.forEach(({ page }: { page: string }) => {
    pageCount[page] = (pageCount[page] || 0) + 1
  })
  const topPages = Object.entries(pageCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([page, count]) => ({ page, count }))

  const dayCount: Record<string, number> = {}
  byDay.data?.forEach(({ created_at }: { created_at: string }) => {
    const day = created_at.slice(0, 10)
    dayCount[day] = (dayCount[day] || 0) + 1
  })
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().slice(0, 10)
    return { day: key, count: dayCount[key] || 0 }
  })

  return NextResponse.json({
    total: total.count || 0,
    today: todayViews.count || 0,
    yesterday: yesterdayViews.count || 0,
    last7: last7Views.count || 0,
    last30: last30Views.count || 0,
    topPages,
    last7Days,
  })
}
