import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_ITEMS = 12

// Cronologia "visti di recente", salvata nel browser come il carrello e i
// preferiti. Tiene solo gli id, più recente prima, senza duplicati: se un
// prodotto viene riaperto risale in cima invece di comparire due volte.
interface RecentlyViewedStore {
  ids: string[]
  add: (productId: string) => void
  clear: () => void
}

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      ids: [],
      add: (productId) => {
        const ids = [productId, ...get().ids.filter(id => id !== productId)].slice(0, MAX_ITEMS)
        set({ ids })
      },
      clear: () => set({ ids: [] }),
    }),
    { name: 'mgshop-recently-viewed' }
  )
)
