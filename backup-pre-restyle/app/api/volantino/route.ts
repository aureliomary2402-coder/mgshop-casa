import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// Elenco leggero dei volantini attivi (usato da header/bottom-nav per capire
// se mostrare la voce "Volantino", e dalla pagina /volantino per decidere se
// mostrare direttamente l'unico volantino attivo oppure un selettore quando
// ce ne sono 2 o più).
export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('volantino_page')
    .select('id, slug, title, subtitle, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
