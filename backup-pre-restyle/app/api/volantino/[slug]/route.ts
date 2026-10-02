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

  // Prima prova a cercare per slug (volantini creati/rinominati dal pannello
  // multi-volantino). Se non trova nulla, ricade sulla ricerca per id: i
  // volantini gestiti dal semplice toggle "Volantino" dell'admin non hanno
  // uno slug impostato, e /volantino li linka usando il loro id.
  let { data, error } = await supabase.from('volantino_page').select('*').eq('slug', slug).maybeSingle()
  if (!data) {
    const byId = await supabase.from('volantino_page').select('*').eq('id', slug).maybeSingle()
    data = byId.data
    error = byId.error
  }
  if (error || !data) return NextResponse.json({ error: 'Volantino non trovato' }, { status: 404 })
  return NextResponse.json(data)
}
