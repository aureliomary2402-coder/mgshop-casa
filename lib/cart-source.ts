import type { CartSource } from './types'

// Determina da quale pagina il cliente ha aggiunto il prodotto al carrello,
// in base all'URL corrente. Usato dal modal scheda-prodotto (che è globale
// e si apre da più pagine) per "fotografare" la provenienza sull'item.
// Qualsiasi altra pagina (negozio, prodotto diretto, preferiti, ricerca,
// home...) ricade su "shop" come provenienza di default.
export function sourceFromPathname(pathname: string | null | undefined): CartSource {
  if (pathname?.startsWith('/volantino')) return 'volantino'
  if (pathname?.startsWith('/promo')) return 'promo'
  return 'shop'
}

export const SOURCE_LABELS: Record<CartSource, string> = {
  shop: 'Negozio',
  volantino: 'Volantino',
  promo: 'Promo',
}
