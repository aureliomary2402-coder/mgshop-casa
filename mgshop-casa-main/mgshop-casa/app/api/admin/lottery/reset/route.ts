import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

// Svuota completamente la scheda della lotteria (titolo, descrizione, foto,
// premio, partecipanti, numero vincente, prezzo biglietto, scadenza) per
// prepararla a una nuova estrazione da zero. Va usato DOPO aver già
// archiviato l'estrazione precedente (bottone "Chiudi ora e archivia" o
// archiviazione automatica): questo endpoint NON tocca lo storico vincitori,
// cancella solo i dati della scheda corrente che altrimenti l'admin
// dovrebbe svuotare a mano campo per campo.
//
// Genera anche un nuovo round_id: così i partecipanti/numeri riservati del
// turno precedente smettono subito di comparire come "di questo turno",
// senza bisogno di cancellare le righe storiche in lottery_tickets/orders
// (restano nel database per lo storico, solo non più agganciate al turno
// attivo).
export async function POST() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()

  const { data: existing } = await supabase.from('lottery').select('id').limit(1).single()
  if (!existing) return NextResponse.json({ error: 'Nessuna lotteria trovata' }, { status: 404 })

  const { data, error } = await supabase.from('lottery').update({
    title: '',
    description: '',
    image_url: null,
    prize_type: 'custom',
    prize_product_id: null,
    prize_coupon_id: null,
    prize_label: '',
    participants_count: 10,
    winner_number: 1,
    ticket_price: 1,
    ends_at: null,
    is_active: false,
    status: 'draft',
    round_id: crypto.randomUUID(),
    updated_at: new Date().toISOString(),
  }).eq('id', existing.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
