import { create } from 'zustand'

// Store globale minimo: permette a qualsiasi componente (es. le bolle della
// homepage) di aprire i pannelli "Punti" o "Chat" già presenti nel
// <FloatingMenu /> montato nel layout, senza duplicare la logica esistente.
interface UIPanelsStore {
  requestPoints: number
  requestChat: number
  openPoints: () => void
  openChat: () => void
}

export const useUIPanelsStore = create<UIPanelsStore>((set) => ({
  requestPoints: 0,
  requestChat: 0,
  openPoints: () => set((s) => ({ requestPoints: s.requestPoints + 1 })),
  openChat: () => set((s) => ({ requestChat: s.requestChat + 1 })),
}))
