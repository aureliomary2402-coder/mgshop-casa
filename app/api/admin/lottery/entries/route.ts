import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Elenco dei clienti che hanno davvero partecipato (pagato +1€) al turno
// attuale della lotteria, con il numero che è stato loro assegnato.
export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()

  const { data: lottery } = await supabase.from('lottery').select('round_id').limit(1).single()
  if (!lottery?.round_id) return NextResponse.json({ entries: [] })

  const { data, error } = await supabase
    .from('orders')
    .select('id, phone_number, customer_name, lottery_number, created_at')
    .eq('lottery_round', lottery.round_id)
    .not('lottery_number', 'is', null)
    .order('lottery_number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data || [] })
}

// Rinomina un partecipante (es. quando si scopre il nome del cliente,
// come si fa già per gli ordini normali).
export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.order_id) return NextResponse.json({ error: 'order_id mancante' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('orders')
    .update({ customer_name: (body.customer_name || '').trim() || null })
    .eq('id', body.order_id)
    .select('id, phone_number, customer_name, lottery_number, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

// Rimuove un cliente dal turno attuale della lotteria: l'ordine resta
// salvato normalmente, semplicemente non partecipa più all'estrazione.
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body.order_id) return NextResponse.json({ error: 'order_id mancante' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('orders')
    .update({ lottery_number: null, lottery_round: null })
    .eq('id', body.order_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
