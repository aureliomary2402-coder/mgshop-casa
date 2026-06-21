"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Sparkles, ArrowRight, Tag } from 'lucide-react'

const WA_URL = "https://whatsapp.com/channel/0029VbChkIv9Bb66CYyUH02u"

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

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
        <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-25"
          style={{ background: 'radial-gradient(circle,#d97706,#92400e)', top: '50%', left: '50%', transform: `translate(calc(-50% + ${mousePos.x * 80}px),calc(-50% + ${mousePos.y * 60}px))`, transition: 'transform 1.2s cubic-bezier(0.22,1,0.36,1)' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-15"
          style={{ background: 'radial-gradient(circle,#f59e0b,#b45309)', top: '30%', left: '30%', transform: `translate(calc(-50% + ${mousePos.x * -50}px),calc(-50% + ${mousePos.y * -40}px))`, transition: 'transform 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>

      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(251,191,36,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(251,191,36,0.8) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className={`relative z-10 text-center px-6 max-w-2xl mx-auto transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
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

        <p className="text-stone-400 text-lg mb-10 leading-relaxed">Prodotti selezionati per la tua casa.<br />Qualità e stile in ogni angolo.</p>

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

        {/* WhatsApp channel link */}
        <a href={WA_URL} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl font-medium text-sm transition-all hover:scale-105 btn-press"
          style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', color: '#4ade80' }}>
          <WhatsAppIcon size={18} />
          Seguici su WhatsApp per offerte esclusive
          <ArrowRight className="w-4 h-4" />
        </a>

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
