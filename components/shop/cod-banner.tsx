"use client"

import { Banknote } from 'lucide-react'

export function CodBanner({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  if (variant === 'dark') {
    return (
      <div className="neon-glow inline-flex items-center gap-2.5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-md">
        <Banknote className="h-4 w-4 text-cyan-300" />
        Pagamento comodo alla consegna o al ritiro
      </div>
    )
  }

  return (
    <div className="neon-glow flex items-center gap-3 rounded-2xl border border-cyan-300/15 bg-[#071a22] p-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10">
        <Banknote className="h-5 w-5 text-cyan-300" />
      </div>
      <p className="text-xs leading-relaxed text-slate-400">
        <strong className="text-white">Pagamento alla consegna o al ritiro:</strong> paghi comodamente in contanti quando ricevi l&apos;ordine o lo ritiri, nessun pagamento online richiesto.
      </p>
    </div>
  )
}
