"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Tag, Package, Star,
  Truck, Banknote, ShieldCheck, Headphones, Sparkles,
} from 'lucide-react'
import { AmbientBubbles } from '@/components/shop/ambient-bubbles'

const HERO_ADVANTAGES = [
  { icon: Truck, label: 'Consegna a mano nella tua zona' },
  { icon: Banknote, label: 'Paghi alla consegna' },
  { icon: Star, label: 'Raccogli punti ad ogni acquisto' },
  { icon: Package, label: 'Nuova lotteria ogni settimana' },
]

const BOTTOM_ADVANTAGES = [
  { icon: Truck, title: 'CONSEGNA RAPIDA', sub: 'Consegna a mano nella tua zona' },
  { icon: Banknote, title: 'PAGAMENTO COMODO', sub: 'Paga alla consegna' },
  { icon: ShieldCheck, title: 'ACQUISTI SICURI', sub: 'Sito sicuro e affidabile' },
  { icon: Headphones, title: 'ASSISTENZA DEDICATA', sub: 'Sempre a tua disposizione' },
]

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="theme-page-bg relative overflow-hidden">
      <AmbientBubbles />

      {/* HERO */}
      <section className="theme-hero relative pt-10 pb-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-4">
            TUTTO PER <span className="text-shimmer">LA TUA CASA</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-2">
            CONSEGNA A CASA TUA.
          </p>
          <p className="text-base text-slate-500 max-w-xl mx-auto mb-8">
            Il tuo negozio di fiducia, sotto casa. Detersivi, prodotti per la pulizia, cura della persona e articoli per la casa.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <Link href="/shop" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-600 text-white font-semibold shadow-lg shadow-cyan-600/25 hover:bg-cyan-700 transition-colors">
              <Sparkles className="w-5 h-5" />
              Scopri i prodotti
            </Link>
            <Link href="/promo" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-cyan-700 font-semibold border border-cyan-200 shadow-sm hover:bg-cyan-50 transition-colors">
              <Tag className="w-5 h-5" />
              Vedi le promo
            </Link>
          </div>

          {/* Vantaggi */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {HERO_ADVANTAGES.map((a, i) => (
              <div key={i} className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <a.icon className="w-6 h-6 text-cyan-600" />
                <span className="text-xs sm:text-sm font-medium text-slate-700 text-center leading-tight">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Shop */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Scopri le offerte della settimana</h2>
              <p className="text-slate-600 mb-6 max-w-lg mx-auto">Trova i migliori prodotti per la tua casa a prezzi imbattibili.</p>
              <Link href="/shop" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-cyan-600 text-white font-semibold shadow-lg shadow-cyan-600/25 hover:bg-cyan-700 transition-colors text-lg">
                Vai allo shop
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Vantaggi bottom */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BOTTOM_ADVANTAGES.map((a, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 shrink-0">
                <a.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">{a.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{a.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
