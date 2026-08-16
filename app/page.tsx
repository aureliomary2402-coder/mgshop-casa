"use client"
import { useEffect, useState } from 'react'
import type { ComponentType, CSSProperties } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ShoppingBag, Tag, Package, Ticket, Star, Newspaper, MapPin, Phone, User,
  Truck, Banknote, ShieldCheck, Headphones, Sparkle, Sparkles,
} from 'lucide-react'
import { HomeHeader } from '@/components/shop/home-header'
import { AmbientBubbles } from '@/components/shop/ambient-bubbles'
import { useUIPanelsStore } from '@/lib/ui-panels-store'

interface BubbleDef {
  key: string
  label: string
  sub: string
  icon: ComponentType<{ className?: string }>
  color: string
  big?: boolean
  badge?: boolean
  mobileArea: string
  desktopArea: string
  action: { type: 'link'; href: string } | { type: 'points' } | { type: 'chat' } | { type: 'soon' }
}

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
  { icon: Headphones, title: 'ASSISTENZA DEDICATA', sub: 'Siamo sempre disponibili per aiutarti' },
]

// Griglie a "grid-template-areas": la disposizione desktop (3 colonne, con
// Negozio al centro) e quella mobile (2 colonne a zig-zag, con le bolle
// singole centrate a tutta larghezza) riproducono le due immagini di
// riferimento senza bisogno di posizionamento assoluto/px, quindi restano
// sicure su qualunque larghezza di schermo.
const DESKTOP_TEMPLATE = `"promo promobox lotteria" "punti negozio volantino" "zona contatti account"`
const MOBILE_TEMPLATE = `"negozio promo" "lotteria lotteria" "promobox volantino" "zona zona" "punti contatti" "account account"`

export default function WelcomePage() {
  const [mounted, setMounted] = useState(false)
  const [promoActive, setPromoActive] = useState(false)
  const [volantinoActive, setVolantinoActive] = useState(false)
  const [lotteryActive, setLotteryActive] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const openPoints = useUIPanelsStore(s => s.openPoints)
  const openChat = useUIPanelsStore(s => s.openChat)

  useEffect(() => {
    setMounted(true)
    fetch('/api/promo').then(r => r.json()).then(d => setPromoActive(d.is_active === true)).catch(() => {})
    fetch('/api/volantino').then(r => r.json()).then(d => setVolantinoActive(d.is_active === true)).catch(() => {})
    fetch('/api/lottery').then(r => r.json()).then(d => setLotteryActive(d.is_active === true)).catch(() => {})
  }, [])

  // Parallax leggero dei glow nella hero, solo desktop (mousemove non esiste su touch)
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 })
    }
    window.addEventListener('mousemove', handleMouse, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  const BUBBLES: BubbleDef[] = [
    { key: 'promo', label: 'Promozioni', sub: 'Scopri le offerte della settimana', icon: Tag, color: '#f59e0b', badge: promoActive, mobileArea: 'promo', desktopArea: 'promo', action: { type: 'link', href: '/promo' } },
    { key: 'promobox', label: 'Promo Box', sub: 'Più prodotti, più convenienza', icon: Package, color: '#9333ea', mobileArea: 'promobox', desktopArea: 'promobox', action: { type: 'soon' } },
    { key: 'lotteria', label: 'Lotteria', sub: 'Scegli il numero e prova a vincere', icon: Ticket, color: '#e11d48', badge: lotteryActive, mobileArea: 'lotteria', desktopArea: 'lotteria', action: { type: 'link', href: '/lotteria' } },
    { key: 'punti', label: 'Punti', sub: 'Accumula punti e ottieni premi', icon: Star, color: '#eab308', mobileArea: 'punti', desktopArea: 'punti', action: { type: 'points' } },
    { key: 'negozio', label: 'Negozio', sub: 'Scopri tutti i prodotti', icon: ShoppingBag, color: '#db2777', big: true, mobileArea: 'negozio', desktopArea: 'negozio', action: { type: 'link', href: '/shop' } },
    { key: 'volantino', label: 'Volantino', sub: 'Sfoglia le nostre offerte', icon: Newspaper, color: '#2563eb', badge: volantinoActive, mobileArea: 'volantino', desktopArea: 'volantino', action: { type: 'link', href: '/volantino' } },
    { key: 'zona', label: 'Zone di Consegna', sub: 'Scopri se consegniamo da te', icon: MapPin, color: '#0891b2', mobileArea: 'zona', desktopArea: 'zona', action: { type: 'link', href: '/consegne' } },
    { key: 'contatti', label: 'Contatti', sub: 'Siamo qui per te', icon: Phone, color: '#16a34a', mobileArea: 'contatti', desktopArea: 'contatti', action: { type: 'chat' } },
    { key: 'account', label: 'Il Mio Account', sub: 'Ordini, punti e premi', icon: User, color: '#2563eb', mobileArea: 'account', desktopArea: 'account', action: { type: 'soon' } },
  ]

  const handleSoon = (label: string) => toast(`${label}: disponibile a breve! ✨`, { duration: 2000 })

  function renderBubble(b: BubbleDef, variant: 'mobile' | 'desktop') {
    const Icon = b.icon
    const area = variant === 'mobile' ? b.mobileArea : b.desktopArea
    const size = b.big
      ? (variant === 'mobile' ? 'w-[38vw] max-w-[155px] aspect-square' : 'w-44 h-44 xl:w-48 xl:h-48 scale-110')
      : (variant === 'mobile' ? 'w-[32vw] max-w-[132px] aspect-square' : 'w-full aspect-square')
    const iconSize = b.big ? 'w-8 h-8' : 'w-5 h-5 sm:w-6 sm:h-6'
    const labelSize = b.big ? 'text-sm sm:text-base font-bold' : 'text-[11px] sm:text-xs font-semibold'
    const wrapperClass = `glass-bubble relative ${size} ${b.big ? 'z-10' : ''} rounded-full flex flex-col items-center justify-center text-center px-2 transition-transform hover:scale-105 active:scale-95 btn-press animate-bubble-bob overflow-hidden`
    const rgb = hexToRgb(b.color)
    const wrapperStyle = {
      gridArea: area,
      justifySelf: 'center',
      '--tint': `rgba(${rgb},0.30)`,
      '--tint-strong': `rgba(${rgb},0.38)`,
      '--sheen-delay': `${(b.key.length % 5) * 1.1}s`,
      animationDelay: `${Math.abs(b.key.length % 5) * 0.3}s`,
    } as CSSProperties

    const content = (
      <>
        <span className="glass-bubble-sheen" style={{ '--sheen-delay': `${(b.key.length % 5) * 1.1}s` } as CSSProperties} />
        <Sparkle className="glass-bubble-sparkle w-2.5 h-2.5" style={{ top: '14%', right: '20%', animationDelay: '0.3s' }} />
        <Sparkle className="glass-bubble-sparkle w-1.5 h-1.5" style={{ bottom: '22%', left: '18%', animationDelay: '1.4s' }} />
        {b.badge && (
          <span className="absolute top-2 right-3 w-2.5 h-2.5 rounded-full animate-pulse-warm z-10"
            style={{ background: '#ef4444', boxShadow: '0 0 0 2px white' }} />
        )}
        <span className="relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center mb-1"
          style={{
            background: `radial-gradient(circle at 32% 28%, ${b.color}40, ${b.color}1f 70%)`,
            color: b.color,
            boxShadow: `inset 0 1px 2px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(${rgb},0.25)`,
          }}>
          <Icon className={iconSize} />
        </span>
        <span className={`relative z-10 ${labelSize}`} style={{ color: '#0c2b36' }}>{b.label}</span>
        {b.big && <span className="relative z-10 hidden sm:block text-[10px] text-slate-500 mt-0.5 leading-tight px-2">{b.sub}</span>}
      </>
    )

    if (b.action.type === 'link') {
      return (
        <Link key={`${variant}-${b.key}`} href={b.action.href} className={wrapperClass} style={wrapperStyle}>
          {content}
        </Link>
      )
    }
    const onClick = b.action.type === 'points' ? openPoints : b.action.type === 'chat' ? openChat : () => handleSoon(b.label)
    return (
      <button key={`${variant}-${b.key}`} onClick={onClick} className={wrapperClass} style={wrapperStyle}>
        {content}
      </button>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#ffffff' }}>
      <HomeHeader />

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

        <div className={`relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-10 lg:py-16 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
          {/* Colonna testo */}
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-5">
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
            <p className="mt-5 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0 text-cyan-100/60">
              Detersivi, prodotti per la pulizia, cura della persona e articoli per la casa.
              Ordina online e paga comodamente alla consegna.
            </p>

            {/* Vantaggi: card 2x2 su mobile, lista verticale su desktop */}
            <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl p-4 text-left lg:hidden"
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
            <div className="hidden lg:flex lg:flex-col gap-3.5 mt-7">
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
          </div>

          {/* Colonna bolle, solo desktop (cluster 3x3 con Negozio al centro) */}
          <div className="hidden lg:grid gap-5 py-4"
            style={{ gridTemplateAreas: DESKTOP_TEMPLATE, gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)' }}>
            {BUBBLES.map(b => renderBubble(b, 'desktop'))}
          </div>
        </div>

        {/* Bolle, solo mobile/tablet (zig-zag 2 colonne come nella foto) */}
        <div className="relative z-10 lg:hidden max-w-md mx-auto px-6 pb-10 grid gap-3.5"
          style={{ gridTemplateAreas: MOBILE_TEMPLATE, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {BUBBLES.map(b => renderBubble(b, 'mobile'))}
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

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r},${g},${b}`
}
