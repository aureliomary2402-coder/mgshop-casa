import type { Product } from './types'

// ID fisso e riconoscibile: sia il carrello sia il checkout lo usano per
// distinguere "un biglietto della lotteria" da un prodotto vero, senza
// bisogno che esista davvero nella tabella products.
export const LOTTERY_TICKET_PRODUCT_ID = 'lottery-ticket'

export function createLotteryTicketProduct(price = 1): Product {
  const now = new Date().toISOString()
  return {
    id: LOTTERY_TICKET_PRODUCT_ID,
    name: 'Biglietto Lotteria',
    description: 'Un numero per partecipare all\u2019estrazione in corso.',
    price,
    category_id: null,
    cover_image: null,
    is_active: true,
    stock: null,
    created_at: now,
    updated_at: now,
  }
}
