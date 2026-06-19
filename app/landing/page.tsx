"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Star, Truck, Shield, ArrowRight, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 bg-black/40 backdrop-blur-md border-b border-white/5">
        <span className="text-lg font-bold tracking-tight">MG<span className="text-amber-400">Shop</span> Casa</span>
        <Link href="/"
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-4 py-2 rounded-full transition-all hover:scale-105 active:scale-95">
          <ShoppingBag className="w-4 h-4" /> Vai al negozio
        </Link>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">

        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-950/30 via-black to-stone-950" />
          {/* 3D floating orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          transform: `translateY(${scrollY * 0.2}px)`
        }} />

        {/* 3D floating cards */}
        <div className="absolute top-20 right-8 md:right-20 hidden md:block"
          style={{ transform: `translateY(${scrollY * -0.15}px) rotateY(-15deg) rotateX(5deg)`, perspective: '800px' }}>
          <div className="w-40 h-52 bg-gradient-to-br from-amber-500/20 to-amber-900/20 backdrop-blur rounded-2xl border border-amber-500/20 shadow-2xl p-4 flex flex-col justify-between">
            <div className="w-full h-24 bg-amber-500/10 rounded-xl animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-2 bg-white/10 rounded w-3/4" />
              <div className="h-2 bg-white/10 rounded w-1/2" />
              <div className="h-3 bg-amber-500/30 rounded w-1/3 mt-2" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-32 left-8 md:left-20 hidden md:block"
          style={{ transform: `translateY(${scrollY * -0.1}px) rotateY(15deg) rotateX(-5deg)`, perspective: '800px' }}>
          <div className="w-36 h-44 bg-gradient-to-br from-stone-800/40 to-stone-900/40 backdrop-blur rounded-2xl border border-white/10 shadow-2xl p-3 flex flex-col justify-between">
            <div className="w-full h-20 bg-white/5 rounded-lg animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="space-y-1">
              <div className="h-2 bg-white/10 rounded w-full" />
              <div className="h-2 bg-white/10 rounded w-2/3" />
              <div className="h-3 bg-amber-500/30 rounded w-1/2 mt-1" />
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            Il tuo negozio di fiducia
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-none">
            <span className="block text-white">Tutto per</span>
            <span className="block bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              la tua casa
            </span>
          </h1>

          <p className="text-lg md:text-xl text-stone-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Prodotti selezionati per la casa a prezzi convenienti.
            Ordina comodamente e ricevi tutto a domicilio.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/"
              className="group flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg px-8 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/25">
              Scopri i prodotti
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/carrello"
              className="flex items-center gap-2 text-stone-300 hover:text-white border border-white/10 hover:border-white/20 px-8 py-4 rounded-2xl transition-all hover:bg-white/5">
              <ShoppingBag className="w-5 h-5" />
              Carrello
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-stone-600 animate-bounce">
          <div className="w-5 h-8 border-2 border-stone-700 rounded-full flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-stone-500 rounded-full animate-scroll-down" />
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="relative py-24 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-stone-950 to-black" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Perché scegliere <span className="text-amber-400">MGShop Casa</span>?
            </h2>
            <p className="text-stone-400 text-lg">Qualità, convenienza e affidabilità in ogni ordine</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Star, title: 'Prodotti selezionati', desc: 'Solo articoli di qualità testati e scelti con cura per la tua casa.', color: 'from-amber-500/20 to-amber-900/10', iconColor: 'text-amber-400' },
              { icon: Truck, title: 'Consegna rapida', desc: 'Ordina oggi, ricevi presto. Gestiamo tutto noi per te.', color: 'from-blue-500/20 to-blue-900/10', iconColor: 'text-blue-400' },
              { icon: Shield, title: 'Acquisto sicuro', desc: 'Ordini gestiti personalmente. Sempre disponibili su WhatsApp.', color: 'from-green-500/20 to-green-900/10', iconColor: 'text-green-400' },
            ].map(({ icon: Icon, title, desc, color, iconColor }) => (
              <div key={title}
                className={`group relative bg-gradient-to-br ${color} border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all hover:-translate-y-1 hover:shadow-2xl`}>
                <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${iconColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-stone-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-950/40 to-orange-950/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Pronto a fare il tuo <span className="text-amber-400">primo ordine</span>?
          </h2>
          <p className="text-stone-400 text-lg mb-10">
            Sfoglia il catalogo, aggiungi al carrello e ordina in pochi clic. Ti contattiamo noi!
          </p>
          <Link href="/"
            className="group inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xl px-10 py-5 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-amber-500/30">
            Vai al negozio
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center">
        <p className="text-stone-600 text-sm">© 2025 MGShop Casa — Tutti i diritti riservati</p>
      </footer>

      <style jsx>{`
        @keyframes scroll-down {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(8px); opacity: 0; }
        }
        .animate-scroll-down {
          animation: scroll-down 1.5s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
