import Link from 'next/link'
import type { ComponentType, CSSProperties, ReactNode } from 'react'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { HeroBackdrop, AccentTitle } from '@/components/shop/hero-backdrop'

// Hero condiviso da tutte le pagine "vetrina" (volantino, promo, lotteria,
// consegne, recensioni, social, preferiti, carrello) con lo stesso stile
// della landing: cambia solo icona/testo passati come props.
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

export function PageHero({
  icon: Icon,
  title,
  subtitle,
  badge,
  cart,
  maxWidth = 'max-w-4xl',
  children,
}: PageHeroProps) {
  const BadgeIcon = badge?.icon

  return (
    <section className="relative overflow-hidden bg-[#06151c]">
      <HeroBackdrop />
      <div className={`relative z-10 ${maxWidth} mx-auto px-5 pb-14 pt-6 text-center sm:px-8 sm:pb-20`}>
        <div className="mb-8 flex items-center justify-between">
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
        </div>

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
          <Icon className="h-7 w-7 text-cyan-300" />
        </div>

        {badge && BadgeIcon && (
          <div className="mb-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200 backdrop-blur-md">
              <BadgeIcon className="h-4 w-4" /> {badge.text}
            </span>
          </div>
        )}

        <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.045em] text-white sm:text-6xl">
          <AccentTitle text={title} />
        </h1>
        {subtitle && (
          <p className={`mx-auto mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg ${children ? 'mb-6' : ''}`}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  )
}
