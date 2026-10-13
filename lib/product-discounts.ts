import { createAdminClient } from '@/lib/supabase/admin'
import { isInWindow, isItemExpired, todayRome, type VolantinoItem } from '@/lib/volantino-window'

type Db = ReturnType<typeof createAdminClient>

// Id dei prodotti che oggi sono dentro un volantino valido.
async function liveFlyerIds(db: Db, today: string = todayRome()) {
  const { data: vols } = await db.from('volantino_page').select('items, start_date, end_date')
  const live = new Set<string>()
  for (const v of vols || []) {
    if (isInWindow(v, today)) for (const i of (v.items || []) as VolantinoItem[]) if (!isItemExpired(i, today)) live.add(i.product_id)
  }
  return live
}

// Sconto diretto su un prodotto (senza volantino): price = prezzo scontato,
// old_price = prezzo pieno, direct_price = ricorda lo sconto diretto anche
// quando un volantino lo sovrascrive. endsAt (YYYY-MM-DD) = ultimo giorno.
// Se il prodotto è in un volantino valido il prezzo in vetrina resta quello
// del volantino: lo sconto diretto riparte quando il volantino finisce.
export async function applyProductDiscount(db: Db, productId: string, salePrice: number, endsAt: string | null) {
  const { data: p } = await db.from('products').select('price, old_price').eq('id', productId).single()
  if (!p) return { error: 'Prodotto non trovato' }
  const fullPrice = p.old_price != null ? Number(p.old_price) : Number(p.price)
  if (!(salePrice > 0) || salePrice >= fullPrice) {
    return { error: `Il prezzo scontato deve essere maggiore di 0 e minore di €${fullPrice.toFixed(2)}` }
  }
  const update: Record<string, unknown> = { direct_price: salePrice, sale_ends_at: endsAt || null, updated_at: new Date().toISOString() }
  if (!(await liveFlyerIds(db)).has(productId)) {
    update.price = salePrice
    update.old_price = fullPrice
  }
  const { error } = await db.from('products').update(update).eq('id', productId)
  if (error) return { error: error.message }
  return { ok: true }
}

// Cambia solo la data di fine di uno sconto diretto già impostato.
export async function setDiscountEnd(db: Db, productId: string, endsAt: string | null) {
  const { data: p } = await db.from('products').select('direct_price').eq('id', productId).single()
  if (!p || p.direct_price == null) return { error: 'Questo prodotto non ha uno sconto diretto' }
  const { error } = await db.from('products').update({ sale_ends_at: endsAt || null }).eq('id', productId)
  if (error) return { error: error.message }
  return { ok: true }
}

// Toglie lo sconto diretto: il prezzo torna a quello pieno (se il prodotto è
// in un volantino valido resta il prezzo del volantino).
export async function clearProductDiscount(db: Db, productId: string) {
  const { data: p } = await db.from('products').select('old_price').eq('id', productId).single()
  if (!p) return { error: 'Prodotto non trovato' }
  const update: Record<string, unknown> = { direct_price: null, sale_ends_at: null, updated_at: new Date().toISOString() }
  if (p.old_price != null && !(await liveFlyerIds(db)).has(productId)) {
    update.price = p.old_price
    update.old_price = null
  }
  const { error } = await db.from('products').update(update).eq('id', productId)
  if (error) return { error: error.message }
  return { ok: true }
}

// Chiude gli sconti diretti scaduti (sale_ends_at < oggi): il prezzo torna
// pieno, salvo che il prodotto sia in un volantino valido (resta quel prezzo).
// Non fa scritture quando non c'è nulla da scadere.
export async function reconcileProductDiscounts(db: Db) {
  const today = todayRome()
  const { data: expired } = await db.from('products').select('id, old_price').lt('sale_ends_at', today)
  if (!expired || expired.length === 0) return
  const live = await liveFlyerIds(db, today)
  for (const p of expired) {
    const update: Record<string, unknown> = { direct_price: null, sale_ends_at: null }
    if (!live.has(p.id) && p.old_price != null) {
      update.price = p.old_price
      update.old_price = null
    }
    await db.from('products').update(update).eq('id', p.id)
  }
}
