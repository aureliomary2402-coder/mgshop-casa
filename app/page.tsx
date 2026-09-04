"use client"
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import {
  Tag, Package, Star, ShoppingBag,
  Truck, Banknote, ShieldCheck, Headphones, Sparkles,
} from 'lucide-react'
import { GlobalHeader } from '@/components/shop/global-header'
import { AmbientBubbles } from '@/components/shop/ambient-bubbles'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Category } from '@/lib/types'

const HERO_ADVANTAGES = [
  { icon: Truck, label: 'Consegna a domicilio o ritiro' },
  { icon: Banknote, label: 'Paghi alla consegna o al ritiro' },
  { icon: Star, label: 'Raccogli punti ad ogni acquisto' },
  { icon: Package, label: 'Nuova lotteria ogni settimana' },
]

const BOTTOM_ADVANTAGES = [
  { icon: Truck, title: 'CONSEGNA O RITIRO', sub: 'A domicilio o vieni a ritirare, come preferisci' },
  { icon: Banknote, title: 'PAGAMENTO COMODO', sub: 'Paga alla consegna o al ritiro' },
  { icon: ShieldCheck, title: 'ACQUISTI SICURI', sub: 'Sito sicuro e affidabile' },
  { icon: Headphones, title: 'ASSISTENZA DEDICATA', sub: 'Siamo sempre disponibili per aiutarti' },
]

export default function WelcomePage() {
  const [mounted, setMounted] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Parallax leggero dei glow nella hero, solo desktop (mousemove non esiste su touch)
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 })
    }
    window.addEventListener('mousemove', handleMouse, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#ffffff' }}>
      <Suspense><GlobalHeader /></Suspense>

      {/* ===== HERO IMMERSIVA (scura, solo sulla home: distingue la home dal resto del sito) ===== */}
      <section className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #04202b 0%, #06303d 30%, #0c2b36 60%, #03131a 100%)' }}>

        {/* Orb animati con leggero parallax al movimento del mouse */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px] opacity-20"
            style={{ background: 'radial-gradient(circle, #0891b2, #155e75)', transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -20}px)`, transition: 'transform 0.8s ease' }} />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[80px] opacity-15"
            style={{ background: 'radial-gradient(circle, #06b6d4, #0e7490)', transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 15}px)`, transition: 'transform 1s ease' }} />
          <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] rounded-full blur-[60px] opacity-10"
            style={{ background: 'radial-gradient(circle, #22d3ee, #0891b2)', transform: `translate(${mousePos.x * -15}px, ${mousePos.y * 25}px)`, transition: 'transform 1.2s ease' }} />
        </div>

        {/* Griglia decorativa */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(34,211,238,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.8) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />

        {/* Anelli decorativi, solo desktop */}
        <div className="absolute top-20 left-10 hidden xl:block opacity-20 animate-spin-slow pointer-events-none">
          <div className="w-28 h-28 rounded-full border-2 border-dashed border-cyan-400" />
        </div>
        <div className="absolute bottom-16 right-14 hidden xl:block opacity-10 animate-spin-slow pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '20s' }}>
          <div className="w-40 h-40 rounded-full border border-cyan-300" />
        </div>

        <AmbientBubbles count={16} theme="dark" />

        <div className={`relative z-10 max-w-3xl mx-auto px-6 pt-10 pb-14 lg:py-20 text-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div className="flex justify-center mb-5">
            <img src="/logo/mgshop-logo-neon.png" alt="MGShop Casa"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full neon-glow-logo" />
          </div>

          <div className="inline-flex items-center gap-2 border border-cyan-500/30 rounded-full px-4 py-1.5 text-cyan-300 text-xs sm:text-sm font-medium mb-5"
            style={{ background: 'rgba(8,145,178,0.1)', backdropFilter: 'blur(10px)' }}>
            <Sparkles className="w-3.5 h-3.5" /> Il tuo negozio di fiducia, sotto casa
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.08]">
            <span className="text-white">TUTTO PER<br />LA TUA CASA.</span><br />
            <span className="text-shimmer">CONSEGNATO<br />A CASA TUA.</span>
          </h1>
          <p className="mt-5 text-sm sm:text-base leading-relaxed max-w-xl mx-auto text-cyan-100/60">
            Detersivi, prodotti per la pulizia, cura della persona e articoli per la casa.
            Ordina online e scegli tu: consegna a domicilio o vieni a ritirare tu, pagando comodamente alla consegna o al ritiro.
          </p>

          {/* Vantaggi: card 2x2 su mobile, riga orizzontale su desktop */}
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl p-4 text-left sm:hidden"
            style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {HERO_ADVANTAGES.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-cyan-300"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <a.icon className="w-4 h-4" />
                </span>
                <span className="text-xs font-medium leading-snug text-cyan-50/90">{a.label}</span>
              </div>
            ))}
          </div>
          <div className="hidden sm:flex sm:flex-wrap sm:justify-center gap-x-6 gap-y-3 mt-7">
            {HERO_ADVANTAGES.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-cyan-300"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <a.icon className="w-[18px] h-[18px]" />
                </span>
                <span className="text-sm font-medium text-cyan-50/90">{a.label}</span>
              </div>
            ))}
          </div>

          <Link href="/promo"
            className="inline-flex items-center gap-2 mt-6 lg:mt-8 px-6 py-3 rounded-full font-bold text-sm text-white transition-transform hover:scale-105 btn-press"
            style={{ background: 'linear-gradient(135deg,#db2777,#ec4899)', boxShadow: '0 8px 24px rgba(219,39,119,0.4)' }}>
            <Tag className="w-4 h-4" /> Scopri le offerte della settimana
          </Link>

          <div className="mt-3">
            <Link href="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-white transition-transform hover:scale-105 btn-press"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <ShoppingBag className="w-4 h-4" /> Vai al negozio
            </Link>
          </div>
        </div>
      </section>

      {/* ===== AREA VANTAGGI ===== */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(8,145,178,0.1)', boxShadow: '0 10px 30px rgba(8,145,178,0.08)' }}>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {BOTTOM_ADVANTAGES.map((a, i) => (
              <div key={i}
                className="flex items-center gap-3 p-4 sm:p-5 sm:border-r last:border-r-0 [&:nth-child(-n+2)]:border-b [&:nth-child(-n+2)]:sm:border-b-0"
                style={{ borderColor: 'rgba(8,145,178,0.08)' }}>
                <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(8,145,178,0.08)', color: '#0891b2' }}>
                  <a.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <div>
                  <p className="text-[11px] sm:text-xs font-bold tracking-wide" style={{ color: '#0c2b36' }}>{a.title}</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-snug">{a.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
