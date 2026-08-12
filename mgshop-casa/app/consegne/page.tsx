"use client"
import Link from 'next/link'
import { ArrowLeft, MapPin, Truck, ShoppingBag, Banknote } from 'lucide-react'
import { AmbientBubbles } from '@/components/shop/ambient-bubbles'
import { Reveal } from '@/components/shop/reveal'

const ZONES = [
  {
    title: 'Aci Sant\u2019Antonio',
    price: 'Consegna gratuita',
    highlight: true,
    note: 'Nessun costo di consegna per gli ordini in città.',
  },
  {
    title: 'Paesi etnei',
    price: 'Consegna a €2,00',
    highlight: false,
    note: 'Piccolo contributo per la consegna nei comuni della zona etnea.',
  },
]

export default function ConsegnePage() {
  return (
    <div className="min-h-screen" style={{ background: '#f0fbfd' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0c2b36,#06303d)' }}>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px] opacity-20" style={{ background: 'radial-gradient(circle,#0891b2,transparent)' }} />
        <AmbientBubbles count={9} theme="dark" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 text-center">
          <Link href="/shop" className="inline-flex items-center gap-2 text-cyan-400/60 hover:text-cyan-300 text-sm transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Negozio
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-cyan-300 text-sm font-medium mb-4"
            style={{ background: 'rgba(8,145,178,0.15)', border: '1px solid rgba(8,145,178,0.3)' }}>
            <Truck className="w-4 h-4" /> Zone di consegna
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">Dove consegniamo</h1>
          <p className="text-lg text-cyan-200/60 max-w-xl mx-auto">
            Siamo un negozio online: Consegniamo direttamente a casa tua nelle zone qui sotto.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="relative overflow-hidden">
        <AmbientBubbles count={16} theme="light" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-6">
          <Reveal>
            <div className="grid sm:grid-cols-2 gap-5">
              {ZONES.map(z => (
                <div key={z.title} className="bg-white rounded-2xl p-6"
                  style={{
                    border: z.highlight ? '1px solid rgba(22,163,74,0.25)' : '1px solid rgba(8,145,178,0.12)',
                    boxShadow: '0 4px 20px rgba(8,145,178,0.08)',
                  }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: z.highlight ? 'rgba(22,163,74,0.1)' : 'rgba(8,145,178,0.1)' }}>
                    <MapPin className="w-5 h-5" style={{ color: z.highlight ? '#16a34a' : '#0891b2' }} />
                  </div>
                  <h3 className="text-lg font-bold mb-1" style={{ color: '#0c2b36' }}>{z.title}</h3>
                  <p className="text-xl font-extrabold mb-2" style={{ color: z.highlight ? '#16a34a' : '#0891b2' }}>{z.price}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{z.note}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)' }}>
              <Banknote className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong className="text-green-700">Pagamento alla consegna:</strong> paghi comodamente in contanti quando ricevi l&apos;ordine, nessun pagamento online richiesto.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <p className="text-sm text-slate-400 text-center">
              La tua zona non è in elenco? Scrivici in chat o su WhatsApp: verifichiamo se possiamo comunque consegnarti l&apos;ordine.
            </p>
          </Reveal>

          <Reveal delay={200} className="text-center pt-4">
            <Link href="/shop" className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-2xl text-white"
              style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)', boxShadow: '0 12px 32px rgba(8,145,178,0.35)' }}>
              <ShoppingBag className="w-5 h-5" /> Vai al negozio
            </Link>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
