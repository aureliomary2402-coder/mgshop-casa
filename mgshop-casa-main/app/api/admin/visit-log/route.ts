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

  const [storeRes, adminRes, storeCount, adminCount] = await Promise.all([
    supabase.from('page_views').select('page, created_at')
      .eq('is_admin', false).order('created_at', { ascending: false }).limit(100),
    supabase.from('page_views').select('page, created_at')
      .eq('is_admin', true).order('created_at', { ascending: false }).limit(100),
    supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('is_admin', false),
    supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('is_admin', true),
  ])

  return NextResponse.json({
    store: { total: storeCount.count || 0, items: storeRes.data || [] },
    admin: { total: adminCount.count || 0, items: adminRes.data || [] },
  })
}
