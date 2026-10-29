import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// Pubblica: espone solo i pop up attivi e solo i campi utili al cliente.
export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('site_popups')
    .select('id, title, message, button_label, button_link, frequency, updated_at')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data ?? [])
}
