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
    const { deviceId, productIds } = body
    if (!deviceId || !Array.isArray(productIds)) return NextResponse.json({ ok: false })

    const supabase = createAdminClient()

    if (productIds.length === 0) {
      await supabase.from('wishlist_snapshots').delete().eq('device_id', deviceId)
      return NextResponse.json({ ok: true })
    }

    const { data: existing } = await supabase
      .from('wishlist_snapshots')
      .select('id, product_ids, updated_at')
      .eq('device_id', deviceId)
      .maybeSingle()

    await supabase.from('wishlist_snapshots').upsert({
      device_id: deviceId,
      product_ids: productIds,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'device_id' })

    // Avvisa a ogni prodotto NUOVO nei preferiti (con i nomi); piu aggiunte
    // di fila entro 1 minuto contano come un solo avviso.
    const prev: string[] = Array.isArray(existing?.product_ids) ? existing.product_ids.map(String) : []
    const added = productIds.map(String).filter((id: string) => !prev.includes(id))
    const recent = existing?.updated_at ? Date.now() - new Date(existing.updated_at).getTime() < 60000 : false
    if (added.length > 0 && !recent) {
      const { data: prods } = await supabase.from('products').select('name').in('id', added.slice(0, 3))
      const names = (prods || []).map((x) => x.name).filter(Boolean)
      const more = added.length > names.length ? ` (+${added.length - names.length})` : ''
      const what = names.length > 0 ? names.join(', ') + more : `${added.length} prodott${added.length === 1 ? 'o' : 'i'}`
      await sendPushToAdmin('Nuovi preferiti', `Un cliente ha aggiunto ai preferiti: ${what}`, '/mgadmin-panel')
        .catch((e) => console.error('Notifica preferiti fallita:', e))
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
