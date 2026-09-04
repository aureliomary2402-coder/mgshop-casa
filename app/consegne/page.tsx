"use client"
import Link from 'next/link'
import { MapPin, Truck, ShoppingBag, Banknote, Store, MessageCircle } from 'lucide-react'
import { AmbientBubbles } from '@/components/shop/ambient-bubbles'
import { Reveal } from '@/components/shop/reveal'
import { PageHero } from '@/components/shop/page-hero'
import { useUIPanelsStore } from '@/lib/ui-panels-store'

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
  const openChat = useUIPanelsStore(s => s.openChat)
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#eafbff 0%,#f5fdff 45%,#ffffff 100%)' }}>
      {/* Hero */}
      <PageHero
        icon={MapPin}
        iconColor="#22d3ee"
        badge={{ icon: Truck, text: 'Consegna e ritiro' }}
        title="Consegna o ritiro"
        subtitle={<span className="block max-w-xl mx-auto">Siamo un negozio online: consegniamo direttamente a casa tua nelle zone qui sotto, oppure puoi scegliere di venire a ritirare il tuo ordine di persona.</span>}
      />

      {/* Content */}
      <div className="relative overflow-hidden">
        <AmbientBubbles count={16} theme="light" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-6">
          <Reveal>
            <div className="grid sm:grid-cols-2 gap-5">
              {ZONES.map(z => (
                <div key={z.title} className="glass-card rounded-2xl p-6"
                  style={{
                    border: z.highlight ? '1px solid rgba(22,163,74,0.25)' : undefined,
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

          <Reveal delay={80}>
            <div className="glass-card rounded-2xl p-6" style={{ border: '1px solid rgba(8,145,178,0.2)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(8,145,178,0.1)' }}>
                <Store className="w-5 h-5" style={{ color: '#0891b2' }} />
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: '#0c2b36' }}>Vieni a ritirare</h3>
              <p className="text-xl font-extrabold mb-2" style={{ color: '#0891b2' }}>Nessun costo</p>
              <p className="text-sm text-slate-500 leading-relaxed">
                Non vuoi la consegna a casa? Nessun problema: puoi scegliere il ritiro al momento dell&apos;ordine. Come per la consegna, ci mettiamo d&apos;accordo su WhatsApp per orario e dettagli del ritiro.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)' }}>
              <Banknote className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong className="text-green-700">Pagamento alla consegna o al ritiro:</strong> paghi comodamente in contanti quando ricevi l&apos;ordine o lo ritiri, nessun pagamento online richiesto.
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <p className="text-sm text-slate-400 text-center">
              La tua zona non è in elenco o preferisci il ritiro? Scrivici in chat o su WhatsApp: organizziamo insieme la soluzione migliore.
            </p>
            <div className="text-center mt-3">
              <button onClick={openChat}
                className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-2xl text-sm"
                style={{ background: 'rgba(8,145,178,0.1)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.2)' }}>
                <MessageCircle className="w-4 h-4" /> Scrivici in chat
              </button>
            </div>
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
