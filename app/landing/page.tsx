"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Star, Truck, Shield, ArrowRight, Sparkles, Heart, Package } from 'lucide-react'

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('mousemove', handleMouse, { passive: true })
    return () => { window.removeEventListener('scroll', handleScroll); window.removeEventListener('mousemove', handleMouse) }
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(135deg, #18181b 0%, #27272a 30%, #1c1c1f 60%, #0a0a0b 100%)' }}>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 glass-dark border-b border-slate-900/20">
        <span className="text-lg font-bold tracking-tight text-white">MG<span className="text-shimmer">Shop</span> Casa</span>
        <Link href="/" className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-500/30 btn-press">
          <ShoppingBag className="w-4 h-4" /> Vai al negozio
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

        {/* Animated warm orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px] opacity-20"
            style={{ background: 'radial-gradient(circle, #0891b2, #155e75)', transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -20}px)`, transition: 'transform 0.8s ease' }} />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full blur-[80px] opacity-15"
            style={{ background: 'radial-gradient(circle, #94a3b8, #475569)', transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 15}px)`, transition: 'transform 1s ease' }} />
          <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] rounded-full blur-[60px] opacity-10"
            style={{ background: 'radial-gradient(circle, #cbd5e1, #94a3b8)', transform: `translate(${mousePos.x * -15}px, ${mousePos.y * 25}px)`, transition: 'transform 1.2s ease' }} />
        </div>

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(148,163,184,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.8) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          transform: `translateY(${scrollY * 0.15}px)`
        }} />

        {/* Floating 3D product cards */}
        <div className="absolute top-24 right-6 md:right-24 hidden lg:block"
          style={{ transform: `translateY(${scrollY * -0.2}px) perspective(800px) rotateY(-20deg) rotateX(8deg)`, transition: 'transform 0.1s linear' }}>
          <div className="w-44 h-56 rounded-2xl border border-slate-500/20 p-4 flex flex-col justify-between animate-float"
            style={{ background: 'linear-gradient(135deg, rgba(100,116,139,0.15), rgba(21,94,117,0.1))', backdropFilter: 'blur(10px)' }}>
            <div className="w-full h-28 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <Package className="w-10 h-10 text-slate-400/50" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2 bg-slate-400/20 rounded-full w-3/4" />
              <div className="h-2 bg-slate-400/15 rounded-full w-1/2" />
              <div className="h-4 bg-slate-500/30 rounded-full w-1/3 mt-2" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-32 left-6 md:left-24 hidden lg:block"
          style={{ transform: `translateY(${scrollY * -0.12}px) perspective(800px) rotateY(15deg) rotateX(-6deg)`, transition: 'transform 0.1s linear' }}>
          <div className="w-36 h-44 rounded-2xl border border-slate-500/20 p-3 flex flex-col justify-between animate-float-slow"
            style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(100,116,139,0.08))', backdropFilter: 'blur(10px)' }}>
            <div className="w-full h-22 rounded-xl bg-slate-400/10 flex items-center justify-center h-24">
              <Heart className="w-8 h-8 text-slate-400/40" />
            </div>
            <div className="space-y-1">
              <div className="h-2 bg-slate-400/20 rounded-full w-full" />
              <div className="h-2 bg-slate-400/15 rounded-full w-2/3" />
              <div className="h-3 bg-slate-500/25 rounded-full w-1/2 mt-1" />
            </div>
          </div>
        </div>

        {/* Decorative spinning ring */}
        <div className="absolute top-20 left-16 hidden md:block opacity-20 animate-spin-slow">
          <div className="w-32 h-32 rounded-full border-2 border-dashed border-cyan-400" />
        </div>
        <div className="absolute bottom-20 right-20 hidden md:block opacity-10 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '20s' }}>
          <div className="w-48 h-48 rounded-full border border-cyan-300" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto pt-16">
          <div className="inline-flex items-center gap-2 border border-slate-500/30 rounded-full px-5 py-2 text-cyan-300 text-sm font-medium mb-10 animate-fade-in"
            style={{ background: 'rgba(100,116,139,0.1)', backdropFilter: 'blur(10px)' }}>
            <Sparkles className="w-4 h-4" />
            Il tuo negozio di fiducia dal 2024
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-none animate-fade-in-up">
            <span className="block text-white mb-2">Tutto per</span>
            <span className="block text-shimmer pb-2">la tua casa</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-100/50 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            Prodotti selezionati con cura per ogni angolo della tua casa.
            Qualità garantita, prezzi onesti, consegna diretta.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <Link href="/"
              className="group flex items-center gap-3 font-bold text-lg px-10 py-5 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-2xl btn-press"
              style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: '#ffffff', boxShadow: '0 20px 40px rgba(100,116,139,0.4)' }}>
              Scopri i prodotti
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/carrello"
              className="flex items-center gap-2 text-slate-200/70 hover:text-cyan-100 border border-slate-500/20 hover:border-slate-500/40 px-8 py-5 rounded-2xl transition-all hover:bg-slate-500/5">
              <ShoppingBag className="w-5 h-5" />
              Il mio carrello
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-16 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            {[['400+', 'Prodotti'], ['⭐⭐⭐⭐⭐', 'Qualità'], ['🚚', 'Consegna']].map(([val, label]) => (
              <div key={label} className="text-center">
                <div className="text-xl font-bold text-cyan-400">{val}</div>
                <div className="text-xs text-slate-200/40 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500/40">
          <div className="w-5 h-8 border border-slate-500/30 rounded-full flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-slate-400/60 rounded-full animate-scroll-indicator" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-28 px-6" style={{ background: 'linear-gradient(180deg, #1c1c1f 0%, #0a0a0b 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Perché scegliere <span className="text-shimmer">MGShop Casa</span>?
            </h2>
            <p className="text-slate-200/40 text-lg">Qualità, convenienza e un servizio che senti vicino</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Star, title: 'Prodotti selezionati', desc: 'Ogni articolo è scelto con cura. Solo qualità che dura nel tempo.', gradient: 'from-slate-600/20 to-slate-900/10', border: 'border-slate-500/20', iconBg: 'bg-slate-500/20', iconColor: 'text-cyan-400' },
              { icon: Truck, title: 'Consegna rapida', desc: 'Ordini gestiti personalmente. Ti contattiamo su WhatsApp per confermare.', gradient: 'from-slate-600/20 to-slate-900/10', border: 'border-slate-500/20', iconBg: 'bg-slate-500/20', iconColor: 'text-sky-400' },
              { icon: Shield, title: 'Acquisto sicuro', desc: 'Nessun rischio. Se non sei soddisfatto, ti aiutiamo a risolvere.', gradient: 'from-teal-600/20 to-teal-900/10', border: 'border-teal-500/20', iconBg: 'bg-teal-500/20', iconColor: 'text-teal-400' },
            ].map(({ icon: Icon, title, desc, gradient, border, iconBg, iconColor }, i) => (
              <div key={title}
                className={`group relative bg-gradient-to-br ${gradient} border ${border} rounded-3xl p-7 card-3d warm-glow-hover`}
                style={{ animationDelay: `${i * 100}ms` }}>
                <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 ${iconColor}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-slate-200/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 px-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0b 0%, #1c1c1f 50%, #0a0a0b 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[80px] opacity-20"
            style={{ background: 'radial-gradient(ellipse, #0891b2, transparent)' }} />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-8 flex items-center justify-center animate-pulse-warm"
            style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}>
            <ShoppingBag className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Pronto per il tuo <span className="text-shimmer">primo ordine</span>?
          </h2>
          <p className="text-slate-200/50 text-lg mb-12 leading-relaxed">
            Sfoglia oltre 400 prodotti, aggiungi al carrello e ordina in pochi secondi.
          </p>
          <Link href="/"
            className="group inline-flex items-center gap-3 font-bold text-xl px-12 py-6 rounded-2xl transition-all hover:scale-105 active:scale-95 btn-press"
            style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: '#ffffff', boxShadow: '0 25px 50px rgba(100,116,139,0.5)' }}>
            Inizia a fare shopping
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900/20 py-8 px-6 text-center" style={{ background: '#0a0a0b' }}>
        <p className="text-slate-200/20 text-sm">© 2025 MGShop Casa — Tutti i diritti riservati</p>
      </footer>
    </div>
  )
}
