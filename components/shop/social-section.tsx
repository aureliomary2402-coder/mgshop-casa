import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { SOCIAL_LINKS, InstagramIcon, TikTokIcon, WhatsAppIcon, FacebookIcon } from '@/components/shop/social-icons'

const ITEMS = [
  { name: 'Instagram', href: SOCIAL_LINKS.instagram, Icon: InstagramIcon, bg: 'linear-gradient(135deg,#f09433,#dc2743,#bc1888)' },
  { name: 'TikTok', href: SOCIAL_LINKS.tiktok, Icon: TikTokIcon, bg: '#0a0a0a' },
  { name: 'WhatsApp', href: SOCIAL_LINKS.whatsapp, Icon: WhatsAppIcon, bg: '#25d366' },
  { name: 'Facebook', href: SOCIAL_LINKS.facebook, Icon: FacebookIcon, bg: '#1877F2' },
]

export function SocialSection() {
  return (
    <section className="relative overflow-hidden bg-[#06151c] px-5 py-12 sm:px-8 sm:py-16">
      <div className="pointer-events-none absolute left-1/2 top-[-120px] h-[260px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-400/15 blur-[100px]" />
      <div className="relative mx-auto max-w-3xl text-center">
        <span className="text-xs font-black uppercase tracking-[.25em] text-cyan-300">Resta connesso</span>
        <h2 className="mt-3 text-3xl font-black tracking-[-.04em] text-white sm:text-4xl">
          Seguici sui <span className="text-cyan-300">social</span>
        </h2>
        <p className="mt-3 text-sm leading-6 text-cyan-100/70">
          Offerte in anteprima, novità e video: non perderti niente.
        </p>
        <div className="mt-7 flex items-center justify-center gap-4">
          {ITEMS.map(({ name, href, Icon, bg }) => (
            <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name}
              className="flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform hover:scale-110 active:scale-95 sm:h-16 sm:w-16"
              style={{ background: bg, border: '1px solid rgba(255,255,255,.18)', boxShadow: '0 0 28px rgba(34,211,238,.25)' }}>
              <Icon size={26} />
            </a>
          ))}
        </div>
        <Link href="/social"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-sm font-black text-[#05212a] transition-transform hover:scale-105 active:scale-95"
          style={{ boxShadow: '0 0 30px rgba(34,211,238,.35)' }}>
          Tutti i nostri canali <ArrowUpRight size={16} />
        </Link>
      </div>
    </section>
  )
}
