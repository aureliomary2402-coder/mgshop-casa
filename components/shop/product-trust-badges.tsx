import { Truck, BadgeCheck, MessageCircle, ShieldCheck } from 'lucide-react'

const BADGES = [
  { icon: Truck, title: 'Consegna o ritiro', sub: 'Come preferisci' },
  { icon: BadgeCheck, title: 'Qualità garantita', sub: 'Prodotti selezionati' },
  { icon: MessageCircle, title: 'Supporto WhatsApp', sub: 'Risposta rapida' },
  { icon: ShieldCheck, title: 'Acquisto sicuro', sub: 'Paghi alla consegna' },
]

// Riquadri di fiducia mostrati nella scheda prodotto (popup e pagina).
// Stile chiaro come le card prodotto: fondo bianco-ciano leggero, bordo
// ciano tenue, icona Lucide in un box ciano chiaro.
export function ProductTrustBadges() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {BADGES.map(({ icon: Icon, title, sub }) => (
        <div
          key={title}
          className="flex items-center gap-3 rounded-2xl border border-cyan-100 bg-gradient-to-br from-white to-cyan-50 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300"
          style={{ boxShadow: '0 8px 24px rgba(8,145,178,0.07)' }}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-100/70">
            <Icon className="h-[18px] w-[18px] text-cyan-700" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black leading-tight text-cyan-950">{title}</div>
            <div className="mt-0.5 text-[10px] leading-tight text-slate-500">{sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
