import { create } from 'zustand'

// Store globale: qualsiasi card prodotto in qualsiasi pagina (negozio,
// volantino, promo, ricerca...) chiama openProductDetail(id) per aprire
// la scheda dettaglio senza cambiare pagina. Il componente <ProductDetailModal />
// è montato una sola volta nel layout principale e legge questo stato.
interface ProductDetailStore {
  openProductId: string | null
  open: (id: string) => void
  close: () => void
}

export const useProductDetailStore = create<ProductDetailStore>((set) => ({
  openProductId: null,
  open: (id) => set({ openProductId: id }),
  close: () => set({ openProductId: null }),
}))
