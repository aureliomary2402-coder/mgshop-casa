import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { ACTIVE_POPUP_THEME } from '@/lib/popup-theme'
import { SLOT_SYMBOLS, symbolForDiscount } from '@/lib/slot-theme'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// Stessa normalizzazione usata in checkout e nel resto del sito.
function normalizePhone(phone: string): string {
  let n = phone.replace(/\D/g, '')
  const prefixes = ['0039', '0044', '0033', '0049', '0034', '001']
  for (const p of prefixes) {
    if (n.startsWith(p)) { n = n.slice(p.length); break }
  }
  if (n.startsWith('39') && n.length === 12) n = n.slice(2)
  if (n.startsWith('44') && n.length === 12) n = n.slice(2)
  if (n.startsWith('33') && n.length === 11) n = n.slice(2)
  if (n.startsWith('49') && n.length === 12) n = n.slice(2)
  if (n.startsWith('34') && n.length === 11) n = n.slice(2)
  if (n.startsWith('1') && n.length === 11) n = n.slice(1)
  if (n.length > 10) n = n.slice(-10)
  return n
}

// Il carrello usa questa GET per sapere se la slot e attiva.
export async function GET() {
  const supabase = createAdminClient()
  const { data } = await supabase.from('slot_settings').select('is_active').limit(1).maybeSingle()
  return NextResponse.json({ enabled: !!data?.is_active })
}

// L'esito lo decide SEMPRE il server (il browser mostra solo l'animazione).
// Una sola giocata per ordine: rifare la richiesta restituisce lo stesso esito.
export async function POST(request: NextRequest) {
  try {
    const { order_id } = await request.json()
    if (!order_id || typeof order_id !== 'string') return NextResponse.json({ error: 'Ordine mancante' }, { status: 400 })

    const supabase = createAdminClient()
    const { data: settings } = await supabase.from('slot_settings').select('is_active, win_probability').limit(1).maybeSingle()
    if (!settings?.is_active) return NextResponse.json({ enabled: false })

    const { data: existing } = await supabase.from('slot_spins').select('*').eq('order_id', order_id).maybeSingle()
    if (existing) return NextResponse.json(toResponse(existing))

    const { data: order } = await supabase.from('orders').select('id, phone_number, created_at').eq('id', order_id).maybeSingle()
    if (!order) return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 })
    // Si gioca subito dopo aver inviato l'ordine, non giorni dopo.
    if (Date.now() - new Date(order.created_at).getTime() > 30 * 60 * 1000)
      return NextResponse.json({ error: 'Il tempo per giocare è scaduto' }, { status: 400 })

    const { data: prizes } = await supabase.from('slot_prizes').select('label, discount_percent, weight').eq('is_active', true)
    const prizeList = prizes || []

    // Probabilita impostata dall'admin (0-100, precisione 0,01%)
    const p = Math.min(100, Math.max(0, Number(settings.win_probability) || 0))
    const won = prizeList.length > 0 && randomInt(0, 10000) / 100 < p

    let prize: { label: string; discount_percent: number } | null = null
    if (won) {
      const totalWeight = prizeList.reduce((s, x) => s + Math.max(1, Number(x.weight) || 1), 0)
      let r = randomInt(0, totalWeight)
      for (const x of prizeList) {
        r -= Math.max(1, Number(x.weight) || 1)
        if (r < 0) { prize = { label: x.label, discount_percent: Number(x.discount_percent) }; break }
      }
    }

    const pool = SLOT_SYMBOLS[ACTIVE_POPUP_THEME]
    const pick = () => pool[randomInt(0, pool.length)]
    let symbols: string[]
    if (prize) {
      // Il simbolo dipende dalla % di sconto (es. 🕸️ 5%, 🦇 10%, 🎃 20%)
      const s = symbolForDiscount(ACTIVE_POPUP_THEME, prize.discount_percent) ?? pick()
      symbols = [s, s, s]
    } else {
      symbols = [pick(), pick(), pick()]
      if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
        symbols[2] = pool[(pool.indexOf(symbols[2]) + 1 + randomInt(0, pool.length - 1)) % pool.length]
      }
    }

    const row = {
      order_id: order.id,
      phone_number: normalizePhone(order.phone_number),
      won: !!prize,
      prize_label: prize?.label ?? null,
      discount_percent: prize?.discount_percent ?? 0,
      symbols,
    }
    const { data: saved, error } = await supabase.from('slot_spins').insert(row).select().single()
    if (error) {
      // Due richieste insieme: vale la prima, l'altra legge il suo esito.
      const { data: again } = await supabase.from('slot_spins').select('*').eq('order_id', order.id).maybeSingle()
      if (again) return NextResponse.json(toResponse(again))
      return NextResponse.json({ error: 'Giocata non riuscita' }, { status: 500 })
    }
    return NextResponse.json(toResponse(saved))
  } catch {
    return NextResponse.json({ error: 'Giocata non riuscita' }, { status: 500 })
  }
}

function toResponse(s: { won: boolean; symbols: string[]; prize_label: string | null; discount_percent: number }) {
  return { enabled: true, won: s.won, symbols: s.symbols, label: s.prize_label, discount_percent: Number(s.discount_percent) }
}
