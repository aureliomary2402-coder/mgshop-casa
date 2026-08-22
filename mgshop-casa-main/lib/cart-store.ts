import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, CustomizationSelection, Product } from './types'
import { buildCartLineId } from './customization'

interface CartStore {
  items: CartItem[]
  lastAdded: number
  addItem: (product: Product, customization?: CustomizationSelection[], unitPrice?: number) => void
  removeItem: (lineId: string) => void
  updateQuantity: (lineId: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

// Chiave della riga di un item nel carrello: gli item salvati prima di
// questa modifica non hanno lineId, quindi si ricade sull'id del prodotto
// (comportamento identico a prima, per i prodotti non personalizzati).
const keyOf = (item: CartItem) => item.lineId || item.product.id

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      lastAdded: 0,
      addItem: (product, customization, unitPrice) => {
        const lineId = buildCartLineId(product.id, customization)
        const items = get().items
        const existing = items.find((i) => keyOf(i) === lineId)
        const newItems = existing
          ? items.map((i) => keyOf(i) === lineId ? { ...i, quantity: i.quantity + 1 } : i)
          : [...items, { product, quantity: 1, customization, lineId, unitPrice }]
        set({ items: newItems, lastAdded: Date.now() })
      },
      removeItem: (lineId) =>
        set({ items: get().items.filter((i) => keyOf(i) !== lineId) }),
      updateQuantity: (lineId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(lineId)
          return
        }
        set({
          items: get().items.map((i) =>
            keyOf(i) === lineId ? { ...i, quantity } : i
          ),
        })
      },
      clearCart: () => set({ items: [] }),
      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getTotalPrice: () =>
        get().items.reduce((sum, i) => sum + (i.unitPrice ?? i.product.price) * i.quantity, 0),
    }),
    { name: 'mgshop-cart' }
  )
)
