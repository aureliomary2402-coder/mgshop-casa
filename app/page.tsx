"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Sparkles, ArrowRight, Tag } from 'lucide-react'
import { SOCIAL_LINKS, InstagramIcon, TikTokIcon, WhatsAppIcon } from '@/components/shop/social-icons'
import { CodBanner } from '@/components/shop/cod-banner'

export default function WelcomePage() {
  const [mounted, setMounted] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [promoActive, setPromoActive] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/promo').then(r => r.json()).then(d => setPromoActive(d.is_active === true)).catch(() => {})
    const h = (e: MouseEvent) => setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 })
    window.addEventListener('mousemove', h, { passive: true })
    return () => window.removeEventListener('mousemove', h)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#0d0500 0%,#1a0800 40%,#2d1500 70%,#1a0800 100%)' }}>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full"
          style={{ top: '50%', left: '50%', transform: `translate(calc(-50% + ${mousePos.x * 80}px),calc(-50% + ${mousePos.y * 60}px))`, transition: 'transform 1.2s cubic-bezier(0.22,1,0.36,1)' }}>
          <div className="w-full h-full rounded-full blur-[120px] opacity-25 animate-breathe" style={{ background: 'radial-gradient(circle,#d97706,#92400e)' }} />
        </div>
        <div className="absolute w-[400px] h-[400px] rounded-full"
          style={{ top: '30%', left: '30%', transform: `translate(calc(-50% + ${mousePos.x * -50}px),calc(-50% + ${mousePos.y * -40}px))`, transition: 'transform 0.8s cubic-bezier(0.22,1,0.36,1)' }}>
          <div className="w-full h-full rounded-full blur-[80px] opacity-15 animate-breathe" style={{ background: 'radial-gradient(circle,#f59e0b,#b45309)', animationDelay: '2s' }} />
        </div>
        {/* Bolle di sapone in salita */}
        {[
          { left: '5%', size: 46, dur: 11, delay: 0 },
          { left: '13%', size: 22, dur: 9, delay: 1.2 },
          { left: '20%', size: 60, dur: 14, delay: 2.5 },
          { left: '28%', size: 16, dur: 8, delay: 0.5 },
          { left: '35%', size: 34, dur: 12, delay: 3.8 },
          { left: '43%', size: 20, dur: 9.5, delay: 1.8 },
          { left: '50%', size: 52, dur: 13, delay: 4.5 },
          { left: '58%', size: 26, dur: 10, delay: 0.2 },
          { left: '65%', size: 40, dur: 11.5, delay: 2.2 },
          { left: '72%', size: 18, dur: 8.5, delay: 3.2 },
          { left: '79%', size: 58, dur: 15, delay: 1 },
          { left: '86%', size: 24, dur: 9, delay: 4 },
          { left: '92%', size: 36, dur: 12.5, delay: 2.8 },
          { left: '96%', size: 14, dur: 7.5, delay: 0.8 },
          { left: '9%', size: 28, dur: 10.5, delay: 5.2 },
          { left: '62%', size: 44, dur: 13.5, delay: 5.8 },
        ].map((b, i) => (
          <div key={i} className="absolute rounded-full animate-bubble-rise"
            style={{
              left: b.left, bottom: '-80px', width: b.size, height: b.size,
              background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85), rgba(217,180,120,0.18) 45%, rgba(180,140,80,0.06) 72%, transparent 100%)',
              boxShadow: 'inset -4px -4px 10px rgba(255,255,255,0.35), inset 3px 3px 8px rgba(217,119,6,0.15), 0 0 14px rgba(255,220,150,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`,
            }} />
        ))}

        {/* Bolle che scoppiano vicino al centro */}
        {[
          { left: '30%', top: '35%', size: 30, delay: 0.5 },
          { left: '68%', top: '28%', size: 22, delay: 2 },
          { left: '48%', top: '55%', size: 18, delay: 3.5 },
        ].map((b, i) => (
          <div key={`pop-${i}`} className="absolute rounded-full animate-bubble-pop"
            style={{
              left: b.left, top: b.top, width: b.size, height: b.size,
              background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.8), rgba(217,180,120,0.15) 50%, transparent 100%)',
              border: '1px solid rgba(255,255,255,0.25)',
              animationDuration: '5s', animationDelay: `${b.delay}s`,
            }} />
        ))}
      </div>

      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(251,191,36,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(251,191,36,0.8) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className={`relative z-10 text-center px-6 max-w-2xl mx-auto ${mounted ? 'animate-bubble-reveal' : 'opacity-0'}`}>
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 animate-float"
            style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)', boxShadow: '0 20px 60px rgba(217,119,6,0.5)' }}>
            <ShoppingBag className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-white leading-none mb-3">
            MG<span className="text-shimmer">Shop</span>
          </h1>
          <p className="text-xl text-amber-200/40 tracking-[0.3em] uppercase font-light">Casa</p>
        </div>

        <p className="text-stone-400 text-lg mb-10 leading-relaxed">
          Prodotti selezionati per la tua casa.<br />Qualità e stile in ogni angolo.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link href="/shop"
            className="group w-full sm:w-auto flex items-center justify-center gap-3 font-bold text-lg px-10 py-5 rounded-2xl text-black transition-all hover:scale-105 active:scale-95 btn-press"
            style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)', boxShadow: '0 16px 40px rgba(217,119,6,0.4)' }}>
            <ShoppingBag className="w-5 h-5" /> Sfoglia il negozio
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {promoActive ? (
            <Link href="/promo"
              className="group w-full sm:w-auto flex items-center justify-center gap-3 font-bold text-lg px-10 py-5 rounded-2xl transition-all hover:scale-105 active:scale-95 btn-press"
              style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.3)', color: '#f59e0b' }}>
              <Sparkles className="w-5 h-5" /> Vedi le promo
              <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded-full font-semibold">OFFERTE</span>
            </Link>
          ) : (
            <Link href="/promo"
              className="w-full sm:w-auto flex items-center justify-center gap-3 font-bold text-lg px-10 py-5 rounded-2xl transition-all hover:scale-105 btn-press"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
              <Tag className="w-5 h-5" /> Promozioni
            </Link>
          )}
        </div>

        <div className="flex justify-center mb-6">
          <CodBanner variant="dark" />
        </div>

        {/* Icone social */}
        <div className="flex items-center justify-center gap-3 mt-2">
          <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press"
            style={{ background: 'rgba(217,70,160,0.15)', border: '1px solid rgba(217,70,160,0.3)', color: '#f472b6' }}>
            <InstagramIcon size={19} />
          </a>
          <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e5e5e5' }}>
            <TikTokIcon size={18} />
          </a>
          <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 btn-press"
            style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', color: '#4ade80' }}>
            <WhatsAppIcon size={19} />
          </a>
        </div>

        <div className="flex items-center justify-center gap-8 mt-10">
          {[['400+', 'Prodotti'], ['⭐⭐⭐⭐⭐', 'Qualità'], ['🚚', 'Consegna rapida']].map(([v, l]) => (
            <div key={l} className="text-center">
              <div className="text-lg font-bold text-amber-400">{v}</div>
              <div className="text-xs text-amber-200/30 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
