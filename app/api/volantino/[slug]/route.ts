import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// Dati completi di un singolo volantino (usato dalla pagina pubblica
// /volantino/[slug] e, per compatibilità, da /volantino quando c'è un solo
// volantino attivo).
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('volantino_page').select('*').eq('slug', slug).single()
  if (error || !data) return NextResponse.json({ error: 'Volantino non trovato' }, { status: 404 })
  return NextResponse.json(data)
}
