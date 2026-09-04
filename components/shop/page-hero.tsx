import Link from 'next/link'
import type { ComponentType, CSSProperties, ReactNode } from 'react'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { PageHeroIcon } from '@/components/shop/page-hero-icon'
import { AmbientBubbles } from '@/components/shop/ambient-bubbles'

// Hero condiviso da tutte le pagine "vetrina" (volantino, promo, lotteria,
// consegne...) cosi' che struttura, spaziatura e stile del badge restino
// identici ovunque: cambia solo icona/colore/testo passati come props.
interface PageHeroProps {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  iconColor: string
  title: ReactNode
  subtitle?: ReactNode
  badge?: { icon: ComponentType<{ className?: string }>; text: string }
  cart?: { count: number; href: string }
  maxWidth?: string
  children?: ReactNode
}

export function PageHero({
  icon,
  iconColor,
  title,
  subtitle,
  badge,
  cart,
  maxWidth = 'max-w-4xl',
  children,
}: PageHeroProps) {
  const BadgeIcon = badge?.icon

  return (
    <div className="relative overflow-hidden theme-hero-dark">
      <AmbientBubbles count={9} theme="dark" />
      <div className={`relative z-10 ${maxWidth} mx-auto px-4 py-12 text-center`}>
        <div className="flex items-center justify-between mb-6">
          <Link href="/shop" className="inline-flex items-center gap-2 text-sm transition-colors" style={{ color: '#67e8f9' }}>
            <ArrowLeft className="w-4 h-4" /> Negozio
          </Link>
          {cart && (
            <Link href={cart.href} className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/10"
              style={{ color: '#e0f7fa', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)' }}>
              <ShoppingBag className="w-4 h-4" />
              Carrello
              {cart.count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-bold" style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
                  {cart.count}
                </span>
              )}
            </Link>
          )}
        </div>

        <PageHeroIcon icon={icon} color={iconColor} />

        {badge && BadgeIcon && (
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-4" style={{ background: 'rgba(8,145,178,0.15)', color: '#67e8f9', border: '1px solid rgba(103,232,249,0.3)' }}>
            <BadgeIcon className="w-4 h-4" /> {badge.text}
          </div>
        )}

        <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-shimmer">{title}</h1>
        {subtitle && (
          <p className={`text-lg ${children ? 'mb-6' : ''}`} style={{ color: 'rgba(224,247,250,0.75)' }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
