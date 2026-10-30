"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// Carosello dei vantaggi per la landing. Ogni slide e una card con grafica a
// emoji (tema Halloween). Per usare una foto vera su una slide basta aggiungere
// `image: '/images/nome-file.jpg'` (file dentro public/images): viene mostrata
// come sfondo con un velo scuro per tenere leggibile il testo.
interface Slide {
  title: string
  text: string
  art: string[]
  gradient: string
  href: string
  cta: string
  image?: string
}

const SLIDES: Slide[] = [
  {
    title: 'Lotteria a premi',
    text: 'Prendi un biglietto, scegli il tuo numero e incrocia le dita: allo scadere del countdown le bolle scoppiano e resta solo quella vincente.',
    art: ['🎟️', '🎃', '🫧'],
    gradient: 'linear-gradient(150deg,#4c1a8a 0%,#2e0d57 60%,#a23800 130%)',
    href: '/lotteria',
    cta: 'Partecipa',
  },
  {
    title: 'Slot dopo ogni ordine',
    text: 'Appena invii l’ordine gira la slot: tre simboli uguali e vinci uno sconto sul tuo prossimo ordine.',
    art: ['🎰', '👻', '🦇'],
    gradient: 'linear-gradient(150deg,#a23800 0%,#5a1c00 60%,#2e0d57 130%)',
    href: '/shop',
    cta: 'Fai un ordine',
  },
  {
    title: 'Raccogli punti',
    text: 'Ogni ordine ti fa accumulare punti: arrivato alla soglia ricevi il tuo premio su WhatsApp.',
    art: ['⭐', '✨', '🍬'],
    gradient: 'linear-gradient(150deg,#2e0d57 0%,#4c1a8a 55%,#7a2fd0 130%)',
    href: '/shop',
    cta: 'Inizia a raccogliere',
  },
  {
    title: 'Porta un amico',
    text: 'Chi viene da te ha il 5% di sconto sul primo ordine e tu ricevi il 10% sul tuo prossimo quando il suo ordine è consegnato.',
    art: ['🤝', '💜', '🕷️'],
    gradient: 'linear-gradient(150deg,#5a1c00 0%,#a23800 50%,#4c1a8a 130%)',
    href: '/shop',
    cta: 'Scopri lo shop',
  },
  {
    title: 'Bonus di benvenuto',
    text: 'È il tuo primo ordine? Usa il coupon BENVENUTO5 e ottieni il 5% di sconto sul totale.',
    art: ['🎁', '🎃', '💀'],
    gradient: 'linear-gradient(150deg,#2e0d57 0%,#a23800 120%)',
    href: '/shop',
    cta: 'Ordina ora',
  },
]

export function BenefitsCarousel() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const pausedUntil = useRef(0)
  const hovering = useRef(false)

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

  // Scorrimento automatico, in pausa mentre l'utente tocca/trascina/passa il mouse
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const iv = setInterval(() => {
      if (hovering.current || Date.now() < pausedUntil.current) return
      const c = ref.current
      if (!c) return
      const atEnd = c.scrollLeft + c.clientWidth >= c.scrollWidth - 4
      if (atEnd) c.scrollTo({ left: 0, behavior: 'smooth' })
      else goTo(Math.min(SLIDES.length - 1, active + 1))
    }, 4500)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const pause = () => { pausedUntil.current = Date.now() + 9000 }

  return (
    <section className="relative overflow-hidden bg-[#120a22] py-16 sm:py-24">
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
          {SLIDES.map((s) => (
            <article
              key={s.title}
              className="relative flex w-[82%] max-w-[360px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-white/10 p-6 sm:w-[340px]"
              style={{ background: s.gradient, minHeight: 360 }}
            >
              {s.image && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-[#120a22]/65" />
                </>
              )}
              <div className="relative flex h-32 items-center justify-center">
                <span className="absolute left-2 top-1 -rotate-12 text-3xl opacity-70">{s.art[1]}</span>
                <span className="absolute bottom-0 right-3 rotate-12 text-3xl opacity-70">{s.art[2]}</span>
                <span className="text-7xl drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]">{s.art[0]}</span>
              </div>
              <h3 className="relative mt-3 text-2xl font-black tracking-[-.02em] text-white">{s.title}</h3>
              <p className="relative mt-2 flex-1 text-sm leading-6 text-white/80">{s.text}</p>
              <Link
                href={s.href}
                className="group relative mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zucca-400 px-5 text-sm font-black text-[#1a0d33] shadow-[0_10px_30px_rgba(255,154,61,.25)] transition hover:bg-zucca-300"
              >
                {s.cta}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </article>
          ))}
          <div className="w-1 shrink-0 sm:w-4" aria-hidden="true" />
        </div>

        <div className="mt-5 flex justify-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              aria-label={`Vai a ${s.title}`}
              onClick={() => { pause(); goTo(i) }}
              className="h-2 rounded-full transition-all"
              style={{ width: i === active ? 24 : 8, background: i === active ? '#ffb066' : 'rgba(255,255,255,0.25)' }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
