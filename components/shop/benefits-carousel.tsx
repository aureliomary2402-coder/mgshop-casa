"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useSiteTheme } from '@/components/site-theme-provider'
import { SLOT_SYMBOLS } from '@/lib/slot-theme'

// Carosello dei vantaggi nella landing. Le slide si gestiscono dal pannello
// admin (tab "Carosello"). Se la tabella non e ancora stata creata si usano le
// slide di partenza qui sotto.
export type GradientKey = 'viola' | 'arancio' | 'notte' | 'zucca' | 'mix'

export interface Slide {
  id?: string
  title: string
  text: string
  emoji: string
  gradient: GradientKey | string
  image_url?: string | null
  cta_label?: string
  cta_link?: string
}

export const GRADIENTS: Record<GradientKey, { label: string; css: string }> = {
  viola: { label: 'Viola', css: 'linear-gradient(150deg,var(--c-4c1a8a) 0%,var(--c-2e0d57) 60%,var(--c-a23800) 130%)' },
  arancio: { label: 'Arancio', css: 'linear-gradient(150deg,var(--c-a23800) 0%,var(--c-5a1c00) 60%,var(--c-2e0d57) 130%)' },
  notte: { label: 'Notte', css: 'linear-gradient(150deg,var(--c-2e0d57) 0%,var(--c-4c1a8a) 55%,#7a2fd0 130%)' },
  zucca: { label: 'Zucca', css: 'linear-gradient(150deg,var(--c-5a1c00) 0%,var(--c-a23800) 50%,var(--c-4c1a8a) 130%)' },
  mix: { label: 'Mix', css: 'linear-gradient(150deg,var(--c-2e0d57) 0%,var(--c-a23800) 120%)' },
}

const DEFAULT_SLIDES: Slide[] = [
  { title: 'Lotteria a premi', text: 'Prendi un biglietto, scegli il tuo numero e incrocia le dita: allo scadere del countdown le bolle scoppiano e resta solo quella vincente.', emoji: '🎟️', gradient: 'viola', cta_label: 'Partecipa', cta_link: '/lotteria' },
  { title: 'Slot dopo ogni ordine', text: 'Appena invii l’ordine gira la slot: tre simboli uguali e vinci uno sconto sul tuo prossimo ordine.', emoji: '🎰', gradient: 'arancio', cta_label: 'Fai un ordine', cta_link: '/shop' },
  { title: 'Raccogli punti', text: 'Ogni ordine ti fa accumulare punti: arrivato alla soglia ricevi il tuo premio su WhatsApp.', emoji: '⭐', gradient: 'notte', cta_label: 'Inizia a raccogliere', cta_link: '/shop' },
  { title: 'Porta un amico', text: 'Chi viene da te ha il 5% di sconto sul primo ordine e tu ricevi il 10% sul tuo prossimo quando il suo ordine è consegnato.', emoji: '🤝', gradient: 'zucca', cta_label: 'Scopri lo shop', cta_link: '/shop' },
  { title: 'Bonus di benvenuto', text: 'È il tuo primo ordine? Usa il coupon BENVENUTO5 e ottieni il 5% di sconto sul totale.', emoji: '🎁', gradient: 'mix', cta_label: 'Ordina ora', cta_link: '/shop' },
]

// Card di una slide. Usata sia dal carosello sia dall'anteprima nel pannello admin.
export function SlideCard({ slide, index = 0, preview = false, className = '' }: { slide: Slide; index?: number; preview?: boolean; className?: string }) {
  const siteTheme = useSiteTheme()
  const pool = SLOT_SYMBOLS[siteTheme]
  const decor1 = pool[(index + 1) % pool.length]
  const decor2 = pool[(index + 3) % pool.length]
  const bg = (GRADIENTS[slide.gradient as GradientKey] || GRADIENTS.viola).css
  const hasCta = !!(slide.cta_label && slide.cta_link)
  const ctaClass = 'group relative mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zucca-400 px-5 text-sm font-black text-[color:var(--c-1a0d33)] shadow-[0_10px_30px_rgba(var(--c-ff9a3d-rgb),.25)] transition hover:bg-zucca-300'

  return (
    <article className={`relative flex flex-col overflow-hidden rounded-3xl border border-white/10 p-6 ${className}`} style={{ background: bg, minHeight: 360 }}>
      {slide.image_url ? (
        <div className="relative h-36 overflow-hidden rounded-2xl border border-white/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.image_url} alt={slide.title} className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : (
        <div className="relative flex h-36 items-center justify-center">
          <span className="absolute left-2 top-1 -rotate-12 text-3xl opacity-70">{decor1}</span>
          <span className="absolute bottom-0 right-3 rotate-12 text-3xl opacity-70">{decor2}</span>
          <span className="text-7xl drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]">{slide.emoji}</span>
        </div>
      )}
      <h3 className="relative mt-3 text-2xl font-black tracking-[-.02em] text-white">{slide.title || 'Titolo'}</h3>
      <p className="relative mt-2 flex-1 text-sm leading-6 text-white/80">{slide.text}</p>
      {hasCta && (preview ? (
        <span className={ctaClass}>{slide.cta_label}<ArrowRight size={16} /></span>
      ) : (
        <Link href={slide.cta_link!} className={ctaClass}>
          {slide.cta_label}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      ))}
    </article>
  )
}

export function BenefitsCarousel() {
  const ref = useRef<HTMLDivElement>(null)
  const [slides, setSlides] = useState<Slide[] | null>(null)
  const [active, setActive] = useState(0)
  const pausedUntil = useRef(0)
  const hovering = useRef(false)

  useEffect(() => {
    let alive = true
    fetch('/api/landing-slides', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { if (alive) setSlides(Array.isArray(d?.slides) ? d.slides : DEFAULT_SLIDES) })
      .catch(() => { if (alive) setSlides(DEFAULT_SLIDES) })
    return () => { alive = false }
  }, [])

  const pad = (c: HTMLDivElement) => parseFloat(getComputedStyle(c).paddingLeft) || 0

  const goTo = (i: number) => {
    const c = ref.current
    const el = c?.children[i] as HTMLElement | undefined
    if (!c || !el) return
    c.scrollTo({ left: el.offsetLeft - pad(c), behavior: 'smooth' })
  }

  const onScroll = () => {
    const c = ref.current
    if (!c) return
    let best = 0, bestDist = Infinity
    Array.from(c.children).forEach((el, i) => {
      const d = Math.abs((el as HTMLElement).offsetLeft - pad(c) - c.scrollLeft)
      if (d < bestDist) { bestDist = d; best = i }
    })
    setActive(best)
  }

  const count = slides?.length || 0

  // Scorrimento automatico, in pausa mentre l'utente tocca/trascina/passa il mouse
  useEffect(() => {
    if (count < 2) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const iv = setInterval(() => {
      if (hovering.current || Date.now() < pausedUntil.current) return
      const c = ref.current
      if (!c) return
      const atEnd = c.scrollLeft + c.clientWidth >= c.scrollWidth - 4
      if (atEnd) c.scrollTo({ left: 0, behavior: 'smooth' })
      else goTo(Math.min(count - 1, active + 1))
    }, 4500)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, count])

  const pause = () => { pausedUntil.current = Date.now() + 9000 }

  // In attesa dei dati: spazio riservato; senza slide la sezione non compare
  if (slides === null) return <section className="bg-[color:var(--c-120a22)]" style={{ minHeight: 520 }} aria-hidden="true" />
  if (slides.length === 0) return null

  return (
    <section className="relative overflow-hidden bg-[color:var(--c-120a22)] py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[380px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zucca-400/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="px-5 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-zucca-300/20 bg-zucca-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-zucca-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-zucca-300" />
            I nostri vantaggi
          </div>
          <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-.03em] text-white sm:text-5xl">
            Ordinare da noi <span className="text-zucca-300">conviene</span>
          </h2>
        </div>

        <div
          ref={ref}
          onScroll={onScroll}
          onTouchStart={pause}
          onPointerDown={pause}
          onMouseEnter={() => { hovering.current = true }}
          onMouseLeave={() => { hovering.current = false }}
          className="scrollbar-hide relative mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-2 sm:px-8"
          style={{ scrollPaddingLeft: 20 }}
        >
          {slides.map((s, i) => (
            <SlideCard key={s.id || s.title} slide={s} index={i} className="w-[82%] max-w-[360px] shrink-0 snap-start sm:w-[340px]" />
          ))}
          <div className="w-1 shrink-0 sm:w-4" aria-hidden="true" />
        </div>

        {slides.length > 1 && (
          <div className="mt-5 flex justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id || s.title}
                aria-label={`Vai a ${s.title}`}
                onClick={() => { pause(); goTo(i) }}
                className="h-2 rounded-full transition-all"
                style={{ width: i === active ? 24 : 8, background: i === active ? 'var(--c-ffb066)' : 'rgba(255,255,255,0.25)' }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
