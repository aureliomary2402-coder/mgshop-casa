import { createAdminClient } from './supabase/admin'

type SupabaseAdmin = ReturnType<typeof createAdminClient>

/**
 * Se la lotteria è attiva e il tempo è scaduto, la archivia da sola nello
 * storico vincitori e la rimette in bozza — senza bisogno che l'admin
 * clicchi manualmente "Archivia". Viene richiamata sia dalla pagina
 * pubblica /api/lottery sia dal pannello admin, così basta che qualcuno
 * (cliente o admin) apra una delle due pagine dopo la scadenza perché
 * l'archiviazione scatti da sola.
 *
 * L'update usa `.eq('is_active', true)` come "lucchetto": se due richieste
 * arrivano nello stesso istante, solo una riesce ad aggiornare la riga
 * (l'altra trova is_active già false) — così non si crea mai un doppione
 * nello storico vincitori.
 */
export async function autoArchiveIfExpired(supabase: SupabaseAdmin, lottery: any) {
  if (!lottery || !lottery.is_active || !lottery.ends_at) return lottery
  if (new Date(lottery.ends_at).getTime() > Date.now()) return lottery

  const { data: claimed } = await supabase.from('lottery')
    .update({ is_active: false, status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', lottery.id)
    .eq('is_active', true)
    .select()
    .single()

  if (claimed) {
    await supabase.from('lottery_winners').insert({
      lottery_title: lottery.title,
      prize_label: lottery.prize_label,
      prize_image_url: lottery.image_url,
      winner_number: lottery.winner_number,
      participants_count: lottery.participants_count,
    })
    return claimed
  }

  // Un'altra richiesta concorrente ha già archiviato nel frattempo:
  // rileggiamo lo stato aggiornato invece di restituire quello vecchio.
  const { data: fresh } = await supabase.from('lottery').select('*').eq('id', lottery.id).single()
  return fresh || lottery
}
