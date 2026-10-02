import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAdmin } from '@/lib/push'

// Il browser invia questa richiesta (via sendBeacon, quindi senza attendere
// risposta) quando l'utente lascia il sito con articoli ancora nel carrello.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false })
    const { sessionId, items, total, phone } = body
    if (!sessionId || !Array.isArray(items) || items.length === 0) return NextResponse.json({ ok: false })

    const supabase = createAdminClient()
    const itemsCount = items.reduce((s: number, i: { quantity?: number }) => s + (i.quantity || 0), 0)
    const cleanPhone = typeof phone === 'string' && phone.trim() ? phone.trim() : null

    // Un carrello per sessione: se il cliente aggiunge/toglie prodotti prima
    // di andarsene per davvero, aggiorniamo lo stesso record invece di
    // crearne uno nuovo. La notifica push parte solo la prima volta.
    const { data: existing } = await supabase
      .from('abandoned_carts')
      .select('id, notified')
      .eq('session_id', sessionId)
      .maybeSingle()

    await supabase.from('abandoned_carts').upsert({
      session_id: sessionId,
      items,
      items_count: itemsCount,
      total: total || 0,
      phone_number: cleanPhone,
      updated_at: new Date().toISOString(),
      notified: existing ? existing.notified : true,
    }, { onConflict: 'session_id' })

    if (!existing) {
      const phonePart = cleanPhone ? ` — numero lasciato: ${cleanPhone}` : ''
      await sendPushToAdmin(
        'Carrello abbandonato',
        `${itemsCount} articol${itemsCount === 1 ? 'o' : 'i'} lasciati nel carrello — €${(total || 0).toFixed(2)}${phonePart}`,
        '/mgadmin-panel'
      ).catch((e) => console.error('Notifica carrello abbandonato fallita:', e))
    }

    // Pulizia di sicurezza: rimuove ogni tanto i carrelli abbandonati più
    // vecchi di 30 giorni, così la lista in admin resta gestibile.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      supabase.from('abandoned_carts').delete().lt('updated_at', cutoff).then(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}

// Il carrello viene "recuperato" (rimosso dalla lista) quando l'ordine
// viene completato con successo, o se l'admin lo elimina manualmente.
export async function DELETE(request: NextRequest) {
  try {
    const { sessionId, id } = await request.json()
    const supabase = createAdminClient()
    if (id) await supabase.from('abandoned_carts').delete().eq('id', id)
    else if (sessionId) await supabase.from('abandoned_carts').delete().eq('session_id', sessionId)
    else return NextResponse.json({ ok: false })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
