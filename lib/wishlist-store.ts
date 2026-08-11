import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Preferiti salvati nel browser del cliente, esattamente come il carrello:
// nessun account richiesto, ma restano legati a questo dispositivo/browser.
// Teniamo solo gli id dei prodotti (non l'oggetto intero come nel carrello)
// perché qui il prezzo può cambiare nel tempo e vogliamo sempre mostrare
// quello aggiornato, non quello del momento in cui è stato salvato.
interface WishlistStore {
  ids: string[]
  toggle: (productId: string) => void
  has: (productId: string) => boolean
  remove: (productId: string) => void
  clear: () => void
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (productId) => {
        const ids = get().ids
        set({ ids: ids.includes(productId) ? ids.filter(id => id !== productId) : [productId, ...ids] })
      },
      has: (productId) => get().ids.includes(productId),
      remove: (productId) => set({ ids: get().ids.filter(id => id !== productId) }),
      clear: () => set({ ids: [] }),
    }),
    { name: 'mgshop-wishlist' }
  )
)
