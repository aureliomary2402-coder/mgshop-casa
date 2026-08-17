"use client"

import { Share2, ArrowUpRight, MessageCircle } from 'lucide-react'
import { PageHero } from '@/components/shop/page-hero'
import { SOCIAL_LINKS, InstagramIcon, TikTokIcon, WhatsAppIcon, FacebookIcon } from '@/components/shop/social-icons'
import { useUIPanelsStore } from '@/lib/ui-panels-store'

const SOCIALS = [
  {
    key: 'instagram',
    name: 'Instagram',
    handle: '@mgshopcasa',
    description: 'Novità, offerte e dietro le quinte del negozio.',
    href: SOCIAL_LINKS.instagram,
    Icon: InstagramIcon,
    neonClass: 'neon-glow-pink',
    bg: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    handle: '@mgshopcasa',
    description: 'Video, prodotti in azione e curiosità in pillole.',
    href: SOCIAL_LINKS.tiktok,
    Icon: TikTokIcon,
    neonClass: 'neon-glow-white',
    bg: '#0a0a0a',
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    handle: 'Canale ufficiale',
    description: 'Iscriviti al canale per ricevere promo in anteprima.',
    href: SOCIAL_LINKS.whatsapp,
    Icon: WhatsAppIcon,
    neonClass: 'neon-glow-green',
    bg: '#25d366',
  },
  {
    key: 'facebook',
    name: 'Facebook',
    handle: 'MGShop Casa',
    description: 'Segui la pagina per aggiornamenti ed eventi.',
    href: SOCIAL_LINKS.facebook,
    Icon: FacebookIcon,
    neonClass: 'neon-glow-blue',
    bg: '#1877F2',
  },
] as const

export default function SocialPage() {
  const openChat = useUIPanelsStore(s => s.openChat)

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#03131a 0%,#071e27 45%,#03131a 100%)' }}>
      <PageHero
        icon={Share2}
        iconColor="#22d3ee"
        badge={{ icon: Share2, text: 'Resta connesso' }}
        title="Seguici sui social"
        subtitle="Tutti i nostri canali in un unico posto: novità, promo e curiosità di MGShop Casa."
      />

      <div className="relative max-w-4xl mx-auto px-4 pb-20 -mt-4">
        {/* Chat diretta, stesso pannello già usato dalla bolla flottante */}
        <button
          onClick={openChat}
          className="group relative flex items-center gap-4 w-full rounded-2xl p-5 mb-5 transition-transform hover:-translate-y-1 neon-glow text-left"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span
            className="w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}
          >
            <MessageCircle className="w-7 h-7" />
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-white">Scrivici in chat</p>
            <p className="text-xs font-medium mb-1" style={{ color: '#67e8f9' }}>Risposta rapida</p>
            <p className="text-xs leading-snug" style={{ color: 'rgba(224,247,250,0.65)' }}>Hai una domanda? Parla subito con noi, senza uscire dal sito.</p>
          </div>

          <ArrowUpRight
            className="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            style={{ color: 'rgba(224,247,250,0.5)' }}
          />
        </button>

        <div className="grid sm:grid-cols-2 gap-5">
          {SOCIALS.map(({ key, name, handle, description, href, Icon, neonClass, bg }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative flex items-center gap-4 rounded-2xl p-5 transition-transform hover:-translate-y-1 ${neonClass}`}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span
                className="w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-white"
                style={{ background: bg }}
              >
                <Icon size={30} />
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-white">{name}</p>
                <p className="text-xs font-medium mb-1" style={{ color: '#67e8f9' }}>{handle}</p>
                <p className="text-xs leading-snug" style={{ color: 'rgba(224,247,250,0.65)' }}>{description}</p>
              </div>

              <ArrowUpRight
                className="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                style={{ color: 'rgba(224,247,250,0.5)' }}
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
