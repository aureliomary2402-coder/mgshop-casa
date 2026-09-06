import type { SupabaseClient } from '@supabase/supabase-js'

// Stati dell'ordine in cui il prodotto è considerato "già preso dal
// magazzino": una volta confermato, resta scalato anche se poi passa a
// spedito/consegnato. Solo tornando a "pending" o annullando si libera.
const STOCK_DEDUCTED_STATUSES = new Set(['confirmed', 'shipped', 'delivered'])

function isDeducted(status: string | null | undefined) {
  return !!status && STOCK_DEDUCTED_STATUSES.has(status)
}

// Da chiamare ogni volta che lo stato di un ordine cambia: confronta lo
// stato precedente e quello nuovo e, solo se si attraversa il confine tra
// "non scalato" e "scalato", aggiorna il magazzino dei prodotti veri
// dell'ordine (quelli con product_id, cioè non i biglietti lotteria né i
// prodotti promo personalizzati creati al volo).
export async function syncStockOnStatusChange(
  supabase: SupabaseClient,
  orderId: string,
  previousStatus: string | null | undefined,
  newStatus: string | null | undefined
) {
  const wasDeducted = isDeducted(previousStatus)
  const isNowDeducted = isDeducted(newStatus)
  if (wasDeducted === isNowDeducted) return // nessun confine attraversato

  const direction = isNowDeducted ? -1 : 1 // -1 = scala, +1 = ripristina

  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId)
    .not('product_id', 'is', null)
  if (!items || items.length === 0) return

  for (const item of items as { product_id: string; quantity: number }[]) {
    const { data: product } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single()
    if (!product || product.stock === null) continue // stock non tracciato per questo prodotto
    const newStock = Math.max(0, product.stock + direction * item.quantity)
    await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id)
  }
}
