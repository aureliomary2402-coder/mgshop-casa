import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoArchiveIfExpired, getTakenLotteryNumbers } from '@/lib/lottery'

// Senza questa riga, Next.js mette in cache questa risposta GET la prima volta
// e la serve sempre uguale (congelata) finché non c'è un nuovo deploy.
// Qui invece serve sempre lo stato reale e aggiornato del database.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const supabase = createAdminClient()
  let { data: lottery } = await supabase.from('lottery').select('*').limit(1).single()
  // Se il conto alla rovescia è scaduto, archivia da sola l'estrazione
  // nello storico vincitori (nessun click manuale richiesto).
  if (lottery) lottery = await autoArchiveIfExpired(supabase, lottery)
  const { data: winners } = await supabase.from('lottery_winners').select('*').order('drawn_at', { ascending: false }).limit(30)

  if (!lottery) {
    return NextResponse.json({ is_active: false, winners: winners || [] })
  }

  const revealed = !!lottery.ends_at && new Date(lottery.ends_at).getTime() <= Date.now()

  // Serve al carrello per mostrare quali numeri sono già stati presi da
  // altri clienti, così chi vuole scegliere il proprio numero vede subito
  // quali sono liberi invece di scoprirlo solo al momento dell'acquisto.
  const takenNumbers = lottery.is_active && lottery.round_id && !revealed
    ? Array.from(await getTakenLotteryNumbers(supabase, lottery.round_id)).sort((a, b) => a - b)
    : []

  return NextResponse.json({
    is_active: lottery.is_active,
    title: lottery.title,
    description: lottery.description,
    image_url: lottery.image_url,
    prize_label: lottery.prize_label,
    participants_count: lottery.participants_count,
    ends_at: lottery.ends_at,
    revealed,
    winner_number: revealed ? lottery.winner_number : null,
    winners: winners || [],
    taken_numbers: takenNumbers,
  })
}
