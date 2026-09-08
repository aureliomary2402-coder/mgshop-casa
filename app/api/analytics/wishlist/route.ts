import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToAdmin } from '@/lib/push'

// Il browser invia questa richiesta ogni volta che il cliente aggiunge o
// toglie un prodotto dai preferiti. Un record per sessione, esattamente
// come per i carrelli abbandonati: se svuota i preferiti del tutto,
// cancelliamo il record invece di tenerlo vuoto.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: false })
    const { sessionId, productIds } = body
    if (!sessionId || !Array.isArray(productIds)) return NextResponse.json({ ok: false })

    const supabase = createAdminClient()

    if (productIds.length === 0) {
      await supabase.from('wishlist_snapshots').delete().eq('session_id', sessionId)
      return NextResponse.json({ ok: true })
    }

    const { data: existing } = await supabase
      .from('wishlist_snapshots')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle()

    await supabase.from('wishlist_snapshots').upsert({
      session_id: sessionId,
      product_ids: productIds,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id' })

    if (!existing) {
      await sendPushToAdmin(
        'Nuovi preferiti',
        `Un cliente ha aggiunto ${productIds.length} prodott${productIds.length === 1 ? 'o' : 'i'} ai preferiti`,
        '/mgadmin-panel'
      ).catch((e) => console.error('Notifica preferiti fallita:', e))
    }

    // Pulizia di sicurezza: rimuove ogni tanto i preferiti più vecchi di 30
    // giorni, così la lista in admin resta gestibile.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      supabase.from('wishlist_snapshots').delete().lt('updated_at', cutoff).then(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
