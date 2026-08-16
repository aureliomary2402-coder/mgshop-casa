"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart } from 'lucide-react'
import { SOCIAL_LINKS, InstagramIcon, TikTokIcon, WhatsAppIcon, FacebookIcon } from './social-icons'
import { MGShopStamp } from './mgshop-logo'

const LINKS = [
  { href: '/shop', label: 'Negozio' },
  { href: '/promo', label: 'Promozioni' },
  { href: '/lotteria', label: 'Lotteria' },
  { href: '/volantino', label: 'Volantino' },
  { href: '/consegne', label: 'Zone di consegna' },
  { href: '/carrello', label: 'Carrello' },
]

export function SiteFooter() {
  const pathname = usePathname()
  if (pathname?.startsWith('/mgadmin-panel')) return null

  return (
    <footer className="relative overflow-hidden mt-10 pb-24 md:pb-10"
      style={{ background: 'linear-gradient(135deg,#0c2b36 0%,#0e3644 55%,#0c2b36 100%)' }}>
      {/* Bolle decorative leggere, coerenti col resto del sito */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        {[
          { left: '6%', size: 18, dur: 10, delay: 0.4 },
          { left: '22%', size: 30, dur: 13, delay: 2.1 },
          { left: '48%', size: 14, dur: 9, delay: 1 },
          { left: '68%', size: 24, dur: 12, delay: 3.4 },
          { left: '86%', size: 20, dur: 11, delay: 0.8 },
        ].map((b, i) => (
          <div key={i} className="absolute rounded-full animate-bubble-rise"
            style={{
              left: b.left, bottom: '-60px', width: b.size, height: b.size,
              background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.5), rgba(110,210,230,0.1) 50%, transparent 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
              animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`,
            }} />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
                <MGShopStamp size={20} />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                MG<span style={{ color: '#22d3ee' }}>Shop</span>
              </span>
            </div>
            <p className="text-sm text-cyan-100/70 leading-relaxed max-w-xs">
              Il tuo negozio di fiducia per la casa.<br />Qualità, convenienza e servizio.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/60 mb-3">Link utili</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {LINKS.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-cyan-100/80 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/60 mb-3">Seguici sui social</p>
            <div className="flex items-center gap-2.5">
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 btn-press"
                style={{ background: 'rgba(217,70,160,0.15)', border: '1px solid rgba(217,70,160,0.3)', color: '#f472b6' }}>
                <InstagramIcon size={17} />
              </a>
              <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 btn-press"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e5e5e5' }}>
                <TikTokIcon size={16} />
              </a>
              <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 btn-press"
                style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', color: '#4ade80' }}>
                <WhatsAppIcon size={17} />
              </a>
              <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 btn-press"
                style={{ background: 'rgba(24,119,242,0.15)', border: '1px solid rgba(24,119,242,0.3)', color: '#60a5fa' }}>
                <FacebookIcon size={17} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs text-cyan-200/40"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="flex items-center gap-1.5">
            <Heart className="w-3 h-3 text-pink-400" style={{ fill: '#f472b6' }} />
            Grazie a tutti i nostri clienti per la fiducia!
          </span>
        </div>
      </div>
    </footer>
  )
}
