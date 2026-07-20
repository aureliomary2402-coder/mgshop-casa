"use client"

import { Banknote } from 'lucide-react'

export function CodBanner({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  if (variant === 'dark') {
    return (
      <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-medium text-sm neon-glow"
        style={{ background: 'rgba(8,145,178,0.1)', border: '1px solid rgba(8,145,178,0.25)', color: '#22d3ee' }}>
        <Banknote className="w-4 h-4" />
        Pagamento comodo alla consegna
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)' }}>
      <Banknote className="w-5 h-5 text-green-600 shrink-0" />
      <p className="text-xs text-slate-600 leading-relaxed">
        <strong className="text-green-700">Pagamento alla consegna:</strong> paghi comodamente in contanti quando ricevi l&apos;ordine, nessun pagamento online richiesto.
      </p>
    </div>
  )
}
