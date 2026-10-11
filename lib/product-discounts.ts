import { createAdminClient } from '@/lib/supabase/admin'
import { isInWindow, todayRome, type VolantinoItem } from '@/lib/volantino-window'

type Db = ReturnType<typeof createAdminClient>

// Mette un prodotto in sconto direttamente (senza volantino), usando lo stesso
// meccanismo del volantino: price = prezzo scontato, old_price = prezzo pieno.
// endsAt (YYYY-MM-DD) è l'ultimo giorno di validità, facoltativo.
export async function applyProductDiscount(db: Db, productId: string, salePrice: number, endsAt: string | null) {
  const { data: p } = await db.from('products').select('price, old_price').eq('id', productId).single()
  if (!p) return { error: 'Prodotto non trovato' }
  const fullPrice = p.old_price != null ? Number(p.old_price) : Number(p.price)
  if (!(salePrice > 0) || salePrice >= fullPrice) {
    return { error: `Il prezzo scontato deve essere maggiore di 0 e minore di €${fullPrice.toFixed(2)}` }
  }
  const { error } = await db
    .from('products')
    .update({ price: salePrice, old_price: fullPrice, sale_ends_at: endsAt || null, updated_at: new Date().toISOString() })
    .eq('id', productId)
  if (error) return { error: error.message }
  return { ok: true }
}

// Toglie lo sconto: il prezzo torna a quello pieno.
export async function clearProductDiscount(db: Db, productId: string) {
  const { data: p } = await db.from('products').select('old_price').eq('id', productId).single()
  if (!p) return { error: 'Prodotto non trovato' }
  const update: Record<string, unknown> = { sale_ends_at: null, updated_at: new Date().toISOString() }
  if (p.old_price != null) {
    update.price = p.old_price
    update.old_price = null
  }
  const { error } = await db.from('products').update(update).eq('id', productId)
  if (error) return { error: error.message }
  return { ok: true }
}

// Ripristina i prezzi dei prodotti il cui sconto diretto è scaduto
// (sale_ends_at < oggi). Se il prodotto è anche in un volantino ancora valido
// non tocca i prezzi (c'è l'offerta del volantino), cancella solo la scadenza.
// Non fa scritture quando non c'è nulla da scadere.
export async function reconcileProductDiscounts(db: Db) {
  const today = todayRome()
  const { data: expired } = await db.from('products').select('id, old_price').lt('sale_ends_at', today)
  if (!expired || expired.length === 0) return

  const { data: vols } = await db.from('volantino_page').select('items, start_date, end_date')
  const live = new Set<string>()
  for (const v of vols || []) {
    if (isInWindow(v, today)) for (const i of (v.items || []) as VolantinoItem[]) live.add(i.product_id)
  }

  for (const p of expired) {
    if (live.has(p.id) || p.old_price == null) {
      await db.from('products').update({ sale_ends_at: null }).eq('id', p.id)
    } else {
      await db.from('products').update({ price: p.old_price, old_price: null, sale_ends_at: null }).eq('id', p.id)
    }
  }
}
