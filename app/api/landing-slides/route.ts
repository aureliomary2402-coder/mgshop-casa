import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// Slide attive del carosello nella landing. Se la tabella non esiste ancora
// (SQL non eseguito) risponde con errore: il carosello usa allora le slide di
// partenza. Con tabella vuota/tutte disattivate restituisce lista vuota.
export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('landing_slides')
    .select('id, title, text, emoji, gradient, image_url, cta_label, cta_link')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ slides: data || [] })
}
