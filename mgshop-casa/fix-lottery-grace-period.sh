#!/bin/bash
set -e

# Esegui questo script dalla cartella del repo (cd ~/mgshop)

cat > "lib/lottery.ts" << 'LOTTERYEOF'
import { createAdminClient } from './supabase/admin'

type SupabaseAdmin = ReturnType<typeof createAdminClient>

// Quanto aspettare dopo la scadenza prima di archiviare automaticamente.
// Serve a lasciare il tempo ai clienti di vedere le bolle scoppiare e il
// numero vincente rivelato sulla pagina pubblica: se disattivassimo la
// lotteria nello stesso istante della scadenza, la pagina la tratterebbe
// subito come "nessuna lotteria attiva" e nessuno vedrebbe la rivelazione.
const GRACE_PERIOD_MS = 15 * 60 * 1000 // 15 minuti

/**
 * Se la lotteria è attiva ed è scaduta da più del periodo di grazia, la
 * archivia da sola nello storico vincitori e la rimette in bozza — senza
 * bisogno che l'admin clicchi manualmente "Archivia". Viene richiamata sia
 * dalla pagina pubblica /api/lottery sia dal pannello admin, così basta che
 * qualcuno (cliente o admin) apra una delle due pagine dopo la scadenza
 * perché l'archiviazione scatti da sola, ma solo a rivelazione già vista.
 *
 * L'update usa `.eq('is_active', true)` come "lucchetto": se due richieste
 * arrivano nello stesso istante, solo una riesce ad aggiornare la riga
 * (l'altra trova is_active già false) — così non si crea mai un doppione
 * nello storico vincitori.
 */
export async function autoArchiveIfExpired(supabase: SupabaseAdmin, lottery: any) {
  if (!lottery || !lottery.is_active || !lottery.ends_at) return lottery
  if (new Date(lottery.ends_at).getTime() + GRACE_PERIOD_MS > Date.now()) return lottery

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
LOTTERYEOF

git add lib/lottery.ts
git commit -m "fix: periodo di grazia prima di auto-archiviare la lotteria, per non nascondere subito la rivelazione ai clienti"
git push
