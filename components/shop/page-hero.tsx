import Link from 'next/link'
import type { ComponentType, CSSProperties, ReactNode } from 'react'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { LandingHero } from '@/components/shop/landing-hero'

// Hero condiviso da tutte le pagine "vetrina" (volantino, promo, lotteria,
// consegne, recensioni, social, preferiti, carrello): stesso disegno della
// landing (vedi LandingHero), cambiano solo icona/testi passati come props.
interface PageHeroProps {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  iconColor?: string
  title: ReactNode
  subtitle?: ReactNode
  badge?: { icon: ComponentType<{ className?: string }>; text: string }
  cart?: { count: number; href: string }
  maxWidth?: string
  children?: ReactNode
}

const PILL =
  'inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15'

export function PageHero({ icon, title, subtitle, badge, cart, children }: PageHeroProps) {
  return (
    <LandingHero
      icon={icon}
      badge={badge}
      title={title}
      subtitle={subtitle}
      topBar={
        <>
          <Link href="/shop" className={PILL}>
            <ArrowLeft className="h-4 w-4" /> Negozio
          </Link>
          {cart && (
            <Link href={cart.href} className={`relative ${PILL}`}>
              <ShoppingBag className="h-4 w-4" />
              Carrello
              {cart.count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-xs font-black text-[#062029]">
                  {cart.count}
                </span>
              )}
            </Link>
          )}
        </>
      }
    >
      {children}
    </LandingHero>
  )
}
