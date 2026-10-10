import { createAdminClient } from '@/lib/supabase/admin'

type Db = ReturnType<typeof createAdminClient>

export interface VolantinoItem {
  product_id: string
  sale_price: number
}

// Data di oggi in formato YYYY-MM-DD, nel fuso orario italiano.
export function todayRome(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date())
}

// Vero se oggi è dentro il periodo del volantino (estremi inclusi).
// Date vuote = nessun limite.
export function isInWindow(
  v: { start_date?: string | null; end_date?: string | null },
  today: string = todayRome()
): boolean {
  if (v.start_date && v.start_date > today) return false
  if (v.end_date && v.end_date < today) return false
  return true
}

// Un volantino è visibile ai clienti se è attivo E oggi è nel suo periodo.
export function isVisible(v: { is_active?: boolean; start_date?: string | null; end_date?: string | null }): boolean {
  return v.is_active === true && isInWindow(v)
}

async function applyPrices(db: Db, items: VolantinoItem[]) {
  for (const it of items) {
    const { data: product } = await db.from('products').select('price, old_price').eq('id', it.product_id).single()
    if (!product) continue
    const fullPrice = product.old_price != null ? product.old_price : product.price
    await db.from('products').update({ price: it.sale_price, old_price: fullPrice }).eq('id', it.product_id)
  }
}

async function restorePrices(db: Db, items: VolantinoItem[], keep: Set<string>) {
  for (const it of items) {
    // Se il prodotto è anche in un altro volantino ancora valido, resta in offerta.
    if (keep.has(it.product_id)) continue
    const { data: product } = await db.from('products').select('old_price').eq('id', it.product_id).single()
    if (product?.old_price != null) {
      await db.from('products').update({ price: product.old_price, old_price: null }).eq('id', it.product_id)
    }
  }
}

// Allinea i prezzi del negozio al periodo di ogni volantino:
// - dentro il periodo e prezzi non ancora applicati -> applica le offerte
// - fuori dal periodo e prezzi ancora applicati -> ripristina i prezzi originali
// Non fa nulla (nessuna scrittura) quando è già tutto allineato.
export async function reconcileVolantini(db: Db) {
  const { data } = await db
    .from('volantino_page')
    .select('id, items, start_date, end_date, prices_applied')
  if (!data) return

  const today = todayRome()
  const liveIds = new Set<string>()
  for (const v of data) {
    if (isInWindow(v, today)) for (const i of (v.items || []) as VolantinoItem[]) liveIds.add(i.product_id)
  }

  for (const v of data) {
    const inWindow = isInWindow(v, today)
    const items = (v.items || []) as VolantinoItem[]
    if (inWindow && !v.prices_applied) {
      await applyPrices(db, items)
      await db.from('volantino_page').update({ prices_applied: true }).eq('id', v.id)
    } else if (!inWindow && v.prices_applied) {
      await restorePrices(db, items, liveIds)
      await db.from('volantino_page').update({ prices_applied: false }).eq('id', v.id)
    }
  }
}
