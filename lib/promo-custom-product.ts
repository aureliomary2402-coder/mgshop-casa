import type { Product } from './types'

// Prefisso per i prodotti creati direttamente nella pagina Promo, che non
// esistono nella tabella "products" del negozio. Permette al carrello e al
// checkout di riconoscerli e trattarli diversamente da un prodotto vero
// (niente controllo di magazzino, niente vincolo di chiave esterna).
const CUSTOM_PROMO_PREFIX = 'promo-custom-'

export function createCustomPromoId(): string {
  return `${CUSTOM_PROMO_PREFIX}${crypto.randomUUID()}`
}

export function isCustomPromoProductId(id: string): boolean {
  return id.startsWith(CUSTOM_PROMO_PREFIX)
}

export function buildCustomPromoProduct(opts: { id: string; name: string; image_url: string | null; price: number }): Product {
  const now = new Date().toISOString()
  return {
    id: opts.id,
    name: opts.name,
    description: '',
    price: opts.price,
    category_id: null,
    cover_image: opts.image_url,
    is_active: true,
    stock: null,
    created_at: now,
    updated_at: now,
  }
}
